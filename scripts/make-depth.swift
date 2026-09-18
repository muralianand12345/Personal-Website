// Builds a depth map for a photo of a person in front of a landscape.
//
//   swiftc -O scripts/make-depth.swift -o /tmp/make-depth
//   /tmp/make-depth public/images/profile/wellington-lookout.jpg \
//       public/images/profile/wellington-lookout-depth.png [mask-out.png]
//
// Rerun whenever the source photo changes; the banner's parallax is only as
// good as this map's alignment with it. The optional mask output is the raw
// person segmentation, useful for checking the cut-out by eye.
//
// The person comes from Apple Vision's built-in segmentation model (no
// download needed). The background gets a simple ground-plane gradient: sky
// and far hills flat at the back, the land coming toward the camera below the
// skyline. White = near, black = far.

import CoreImage
import Foundation
import ImageIO
import UniformTypeIdentifiers
import Vision

let args = CommandLine.arguments
guard args.count == 3 || args.count == 4 else {
    FileHandle.standardError.write("usage: make-depth <input> <depth-out.png> [mask-out.png]\n".data(using: .utf8)!)
    exit(2)
}

guard let source = CGImageSourceCreateWithURL(URL(fileURLWithPath: args[1]) as CFURL, nil),
      let photo = CGImageSourceCreateImageAtIndex(source, 0, nil)
else { fatalError("could not read \(args[1])") }

// --- 1. Segment the person -------------------------------------------------
let request = VNGeneratePersonSegmentationRequest()
request.qualityLevel = .accurate
request.outputPixelFormat = kCVPixelFormatType_OneComponent8
try VNImageRequestHandler(cgImage: photo, options: [:]).perform([request])
guard let observation = request.results?.first else { fatalError("no person found") }
let rawMask = CIImage(cvPixelBuffer: observation.pixelBuffer)
print("vision mask: \(Int(rawMask.extent.width))x\(Int(rawMask.extent.height))")

// Depth maps are smooth, so half the photo's width is plenty.
let W = 900
let H = Int((Double(W) * Double(photo.height) / Double(photo.width)).rounded())

let scaledMask = rawMask.transformed(by: CGAffineTransform(
    scaleX: CGFloat(W) / rawMask.extent.width,
    y: CGFloat(H) / rawMask.extent.height))
let context = CIContext(options: [.workingColorSpace: NSNull(), .outputColorSpace: NSNull()])
var mask = [UInt8](repeating: 0, count: W * H)
context.render(scaledMask, toBitmap: &mask, rowBytes: W,
               bounds: CGRect(x: 0, y: 0, width: W, height: H), format: .L8, colorSpace: nil)

// --- 2. Filters on float buffers --------------------------------------------
func maxFilter(_ src: [Float], radius r: Int) -> [Float] {
    var tmp = src, out = src
    for y in 0..<H { for x in 0..<W {
        var m: Float = 0
        for k in max(0, x - r)...min(W - 1, x + r) { m = max(m, src[y * W + k]) }
        tmp[y * W + x] = m
    } }
    for y in 0..<H { for x in 0..<W {
        var m: Float = 0
        for k in max(0, y - r)...min(H - 1, y + r) { m = max(m, tmp[k * W + x]) }
        out[y * W + x] = m
    } }
    return out
}

func boxBlur(_ src: [Float], radius r: Int, passes: Int) -> [Float] {
    var cur = src
    for _ in 0..<passes {
        var tmp = cur
        for y in 0..<H { for x in 0..<W {
            var s: Float = 0; var n: Float = 0
            for k in max(0, x - r)...min(W - 1, x + r) { s += cur[y * W + k]; n += 1 }
            tmp[y * W + x] = s / n
        } }
        for y in 0..<H { for x in 0..<W {
            var s: Float = 0; var n: Float = 0
            for k in max(0, y - r)...min(H - 1, y + r) { s += tmp[k * W + x]; n += 1 }
            cur[y * W + x] = s / n
        } }
    }
    return cur
}

// --- 3. Compose depth ---------------------------------------------------------
// Grow the person slightly before softening, so the stretch zone that any
// displacement map produces at a depth edge lands on the soft-focus background
// rather than eating into the silhouette.
let person = boxBlur(maxFilter(mask.map { Float($0) / 255 }, radius: 4), radius: 4, passes: 3)

func ground(_ y: Int) -> Float {
    let t = Float(y) / Float(H - 1)       // 0 = top edge, 1 = bottom edge
    let skyline: Float = 0.24             // hills meet the sky about here
    if t <= skyline { return 0 }
    let u = (t - skyline) / (1 - skyline)
    return 0.5 * pow(u, 1.3)              // railing at the bottom ≈ 0.5
}

var depth = [Float](repeating: 0, count: W * H)
for y in 0..<H {
    let g = ground(y)
    for x in 0..<W {
        let m = person[y * W + x]
        depth[y * W + x] = g * (1 - m) + 1.0 * m
    }
}
depth = boxBlur(depth, radius: 2, passes: 2)

// --- 4. Write grayscale PNGs ---------------------------------------------------
func writeGray(_ values: [Float], to path: String) {
    var bytes = values.map { UInt8(max(0, min(255, ($0 * 255).rounded()))) }
    let provider = CGDataProvider(data: Data(bytes: &bytes, count: bytes.count) as CFData)!
    let image = CGImage(width: W, height: H, bitsPerComponent: 8, bitsPerPixel: 8, bytesPerRow: W,
                        space: CGColorSpaceCreateDeviceGray(), bitmapInfo: CGBitmapInfo(rawValue: 0),
                        provider: provider, decode: nil, shouldInterpolate: false, intent: .defaultIntent)!
    let dest = CGImageDestinationCreateWithURL(URL(fileURLWithPath: path) as CFURL,
                                               UTType.png.identifier as CFString, 1, nil)!
    CGImageDestinationAddImage(dest, image, nil)
    guard CGImageDestinationFinalize(dest) else { fatalError("could not write \(path)") }
}

writeGray(depth, to: args[2])
if args.count == 4 { writeGray(mask.map { Float($0) / 255 }, to: args[3]) }
print("wrote \(W)x\(H) depth map")
