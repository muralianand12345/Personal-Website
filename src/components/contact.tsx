"use client"

const Contact = () => {
    const openMailClient = () => {
        const to = "connect@muralianand.in"
        const subject = "Website contact"
        const body = "Hello,%0D%0A%0D%0A"
        const mailto = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${body}`
        try {
            window.location.href = mailto
        } catch (err) {
            console.error("Failed to open mail client", err)
        }
    }

    return (
        <section id="contact" className="py-20 px-4 sm:px-6 lg:px-8 bg-black">
            <div className="max-w-2xl mx-auto text-center">
                <h2 className="text-4xl font-bold mb-6">Let's Create Together</h2>
                <p className="text-white/70 mb-12">
                    Have an AI project or collaboration in mind? I'd love to hear about it. Reach out and let's build something
                    amazing.
                </p>

                <div className="mt-6">
                    <button
                        onClick={openMailClient}
                        className="bg-white text-black hover:bg-white/90 rounded-full px-8 py-3 h-12 font-medium"
                    >
                        Mail Me
                    </button>
                </div>
            </div>
        </section>
    )
}

export default Contact
