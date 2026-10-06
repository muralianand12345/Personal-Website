---
title: How GPS Knows Where You Are
description: A 10-minute guide to the satellites, atomic clocks and Einstein-sized corrections hiding behind the blue dot on your phone's map.
date: 2026-10-06
---

You open a map on your phone, and within a few seconds a blue dot appears, usually within a few metres of where you're standing. It feels like the most ordinary thing in the world. Behind it, though, is one of the most remarkable machines humans have ever built: a fleet of satellites carrying atomic clocks, a signal weaker than the background noise of the universe, and a correction that only works because Einstein was right about time.

This is a longer read. Make a cup of tea, and let's follow the blue dot all the way back to space.

## The big idea: measuring distance with time

At heart, GPS is about one very simple trick: **if you know how long a signal took to reach you, you know how far away its source is.**

You already use this trick during thunderstorms. You see the lightning, count the seconds until you hear the thunder, and work out how far away the strike was. GPS does the same thing, except it uses radio waves, which travel at the speed of light, about **300,000 kilometres per second**.

Each GPS satellite constantly broadcasts a message that says, in effect: *"I am satellite number such-and-such. Here is exactly where I am, and this message left me at exactly this time."*

Your receiver notes when the message arrives, subtracts the time it was sent, and multiplies by the speed of light. The result is your distance from that satellite.

That's it. Everything else in this article is about making that one measurement accurate enough to be useful, which turns out to be very hard indeed.

## From distances to a position

Knowing your distance from one satellite doesn't tell you where you are. It only tells you that you are somewhere on the surface of an imaginary sphere centred on that satellite.

Add a second satellite and you know you're somewhere on the circle where the two spheres overlap. Add a third, and that circle crosses the third sphere at just two points. One of them is usually far out in space or moving at an impossible speed, so the receiver can throw it away. The other is you.

This method is called **trilateration**: finding a position from distances alone. (It's often called *triangulation*, but triangulation strictly means working from angles, which GPS doesn't use.)

So three satellites should be enough. In practice, your receiver needs **four**. To see why, we need to talk about clocks.

## The clock problem

Light is fast. In a single nanosecond, a billionth of a second, it travels about **30 centimetres**. That means a clock that is wrong by just one millionth of a second would put your position off by about **300 metres**.

The satellites solve this by carrying **atomic clocks**, which use the steady vibrations of rubidium or caesium atoms to keep time. These clocks are extraordinarily accurate, and they are constantly checked and corrected from the ground.

Your phone, on the other hand, has an ordinary quartz clock that costs a few cents. It drifts by far more than a microsecond. If the receiver trusted its own clock, every distance it calculated would be wildly wrong.

Here's the elegant solution. The receiver doesn't trust its own clock at all. Instead, it treats its clock error as **one more unknown** to solve for, alongside its three position coordinates:

- east–west position,
- north–south position,
- height,
- and how wrong its own clock is.

Four unknowns need four equations, which means four satellites. With a fourth signal, the receiver can work out exactly how far off its clock is and remove that error from every measurement. As a bonus, your phone ends up knowing the time almost as precisely as an atomic clock.

> [!NOTE]
> Because of this, GPS is just as much a **timing system** as a positioning system. Mobile phone networks, power grids, stock exchanges and data centres all use GPS time to keep their equipment in sync. Some of the most critical users of GPS never care where they are; they only care what time it is.

## The constellation

The GPS network is run by the **United States Space Force**. It is designed around **24 satellite slots**, but there are usually around **31** working satellites in orbit, so there are spares and better coverage.

They fly in **medium Earth orbit**, about **20,200 kilometres** up, much higher than the International Space Station (around 400 km) but much lower than the geostationary satellites used for TV (about 36,000 km). Each one circles the Earth roughly **twice a day**, completing an orbit in just under 12 hours.

The satellites are spread across **six orbital planes**, tilted at 55 degrees to the equator. This arrangement is chosen so that from almost anywhere on Earth, at almost any time, at least four satellites are above the horizon. In open sky you'll often see eight or more.

## A short history

The ideas behind GPS go back to the start of the space age. When the Soviet Union launched **Sputnik** in 1957, scientists at Johns Hopkins University noticed that they could work out the satellite's orbit by listening to the Doppler shift in its radio beeps. Others quickly realised the reverse was also true: if you knew where the satellite was, you could use its signal to work out where *you* were.

That idea led to early US Navy satellite navigation systems in the 1960s. The modern GPS programme began in 1973, and the first satellite was launched in **1978**. The system was declared fully operational in **1995**.

GPS was built for the military, but two decisions turned it into a public utility:

- In **1983**, after a Korean Air Lines passenger plane strayed into Soviet airspace and was shot down, US President Ronald Reagan announced that GPS would be made available for civilian use once it was complete.
- For years, though, the civilian signal was deliberately degraded by a feature called **Selective Availability**, which added random errors of up to about 100 metres. On **2 May 2000**, it was switched off. Overnight, civilian GPS became around ten times more accurate, and car navigation, and eventually the smartphone map, became practical.

## Einstein in your pocket

This is the part that sounds like science fiction. GPS only works because it corrects for **both** of Einstein's theories of relativity.

**Special relativity** says that moving clocks run slow. The satellites travel at about 14,000 kilometres per hour relative to the ground, so their clocks lose about **7 microseconds per day** compared with clocks on Earth.

**General relativity** says that clocks run faster where gravity is weaker. Twenty thousand kilometres up, Earth's gravity is noticeably weaker, so the satellite clocks gain about **45 microseconds per day**.

Put them together and the satellite clocks run fast by about **38 microseconds every day**.

That might sound like nothing. But remember that one microsecond of error means about 300 metres of distance. If nobody corrected for relativity, GPS positions would drift by around **10 kilometres every single day**. Within a week, your blue dot would be in the wrong city.

The fix is built in before launch. The satellites' clocks are deliberately tuned to tick very slightly slow: their base frequency is set to **10.22999999543 MHz** instead of the standard 10.23 MHz. Once in orbit, relativity speeds them up by just the right amount, and from the ground they appear to tick at exactly the right rate.

> [!TIP]
> Next time someone says relativity is only abstract theory with no practical use, point at their phone. Every time it finds its location, it is quietly relying on the fact that time runs at different speeds at different heights and speeds.

## A whisper from space

Each GPS satellite transmits with roughly the power of a few household light bulbs, tens of watts, from 20,000 km away. By the time the signal reaches the ground, it is unimaginably weak: around **a ten-thousand-trillionth of a watt**. That is actually *below* the level of the natural radio noise all around us. If you could tune an ordinary radio to GPS frequencies, you'd hear nothing but hiss.

So how does your phone hear it at all? The answer is a technique called **spread spectrum**.

Every satellite repeats its own unique pattern of 1,023 ones and zeros, called a **pseudo-random code**, over and over, a thousand times a second. To anyone who doesn't know the pattern, it looks like random noise. But your receiver *does* know each satellite's pattern. It generates its own copy and slides it backwards and forwards in time, looking for a match. When the copy lines up with the faint pattern buried in the noise, the signal suddenly stands out clearly.

This matching process does two jobs at once:

1. It **pulls the signal out of the noise**, because adding up thousands of tiny matches builds a strong signal while random noise cancels out.
2. It **measures the timing**. How far the receiver had to shift its copy to make it line up tells it precisely when the signal arrived, which is exactly the number it needs to calculate distance.

All satellites share the same main civilian frequency, **1575.42 MHz**, known as L1. Because each one uses a different code, the receiver can tell them apart even though they are all talking at once.

## Knowing where the satellites are

To use a satellite's distance, your receiver also needs to know **exactly where that satellite is**. The satellites broadcast this themselves, in two kinds of data:

- The **ephemeris**: a precise, short-term description of that satellite's own orbit, updated every couple of hours.
- The **almanac**: a rougher map of where *all* the satellites are, which helps the receiver know which ones to look for.

The catch is that the GPS data message is very slow, just **50 bits per second**. Downloading the full almanac takes **12.5 minutes**. That's why old standalone GPS units sometimes needed several minutes to find their position after being switched on in a new place, a so-called **cold start**.

Your phone cheats, in a good way. It uses **Assisted GPS (A-GPS)**: it downloads the satellite orbit data over the mobile network or Wi-Fi in a fraction of a second, and uses nearby cell towers and Wi-Fi networks to make a rough first guess at where you are. That's why your phone usually gets a fix in seconds.

## Why the blue dot sometimes wanders

Even with atomic clocks and relativity accounted for, plenty can still go wrong between space and your hand.

### The atmosphere slows the signal

Radio signals travel at the speed of light only in a vacuum. On the way down, they pass through the **ionosphere**, a layer of charged particles high in the atmosphere, and then the lower atmosphere, where water vapour also slows them slightly. Each delay makes a satellite appear a little further away than it really is.

Receivers use models to estimate and remove most of this delay. Better still, the ionosphere slows different frequencies by different amounts. Newer phones that can receive a second civilian frequency, called **L5**, compare the two signals and cancel out most of the ionospheric error directly.

### Signals bounce

In cities, signals bounce off buildings before reaching you. The bounced signal has travelled further, so it makes the satellite seem further away. This **multipath** error is why your location jumps around on the wrong side of the street in a city centre, a problem often called the **urban canyon**.

### Geometry matters

If all the satellites your receiver can see are bunched together in one part of the sky, small errors in each measurement add up to a large uncertainty in your position. If they are spread out, the errors largely cancel. Receivers keep track of this using a number called **dilution of precision**. It's one reason why more satellites, and more satellite systems, give better results.

### What all that adds up to

According to the US government, a typical GPS-enabled smartphone is accurate to within about **4.9 metres** under open sky. Indoors, under trees or between tall buildings, it can be much worse.

## Getting down to centimetres

For most of us, a few metres is plenty. But farmers steering tractors, surveyors marking property lines and engineers building roads need much better. A few tricks make that possible:

- **Augmentation systems** such as WAAS in North America, EGNOS in Europe and GAGAN in India use ground stations at known locations to measure GPS errors and broadcast corrections, improving accuracy to around a metre and adding integrity checks for aircraft.
- **Real-time kinematic (RTK)** positioning goes further. A fixed base station nearby measures the exact phase of the carrier wave, not just the code, and sends corrections to a moving receiver. This can deliver accuracy of **one to two centimetres**.

## GPS isn't the only system

"GPS" is really the name of the American system. The general term is **GNSS**, for Global Navigation Satellite System, and there are now four global ones:

- **GPS** (United States)
- **GLONASS** (Russia)
- **Galileo** (European Union)
- **BeiDou** (China)

There are also regional systems, such as India's **NavIC** and Japan's **QZSS**, which add extra satellites over their part of the world.

Most modern phones listen to several of these at once. That means dozens of satellites in view instead of just eight or ten, which helps a lot in cities, where tall buildings block large parts of the sky.

## Your phone only listens

One of the most common misunderstandings about GPS is that the satellites are tracking you. They aren't. GPS is a **one-way, receive-only** system. The satellites broadcast; your receiver listens and does all the maths itself. The satellites have no idea you exist, and they could serve every receiver on Earth at once without noticing.

If an app shares your location, that happens afterwards, when your phone sends the position it calculated over the internet. GPS itself doesn't reveal anything about you.

## When things go wrong

Because GPS signals are so faint, they are easy to drown out. **Jamming**, simply broadcasting noise on GPS frequencies, can block reception over a wide area. **Spoofing** is more devious: broadcasting fake GPS signals to make receivers believe they are somewhere else. Both have become a growing problem for ships and aircraft in some parts of the world.

There have also been odd software problems. The GPS signal counts time in weeks, and the original week counter used just 10 bits, so it could only count up to **1,024 weeks**, about 19.6 years, before rolling back to zero. This rollover happened in **August 1999** and again in **April 2019**, and some older devices that weren't prepared for it suddenly showed dates from decades earlier. Newer signals use a larger counter to avoid the problem.

## The whole journey, start to finish

Let's put it all together. Here's what happens in the few seconds after you open your map:

1. Your phone makes a rough guess at its location using cell towers and Wi-Fi, and downloads current satellite orbit data over the network.
2. Its GPS chip starts listening on the L1 frequency (and L5, if it can), searching for each satellite's pseudo-random code in the noise.
3. For each satellite it locks on to, it measures exactly when the signal arrived.
4. It reads, or already knows, where each satellite was and when it sent its signal.
5. It corrects for atmospheric delays, using models or the difference between two frequencies.
6. Using at least four satellites, it solves for its position **and** its own clock error.
7. It combines satellites from GPS, Galileo, GLONASS and BeiDou to improve accuracy, and smooths the result with motion sensors.
8. A blue dot appears on the map.

Every step depends on clocks that tick to within billionths of a second, on satellites whose positions are known to within a metre, and on a correction that only makes sense if time itself flows differently in orbit.

## In short

- GPS works by **measuring how long signals take** to arrive from satellites, and turning those times into distances.
- With distances to **four satellites**, a receiver can work out its position and correct its own cheap clock.
- About **31 satellites** orbit 20,200 km up, each carrying **atomic clocks**.
- Without corrections for **special and general relativity**, GPS would drift by about **10 km a day**.
- The signals are weaker than background noise, and are pulled out using **spread-spectrum codes**.
- Phones get a fix quickly thanks to **Assisted GPS**, and accuracy is usually within about **5 metres** in open sky.
- GPS is **receive-only**: the satellites never know where you are.

> [!TIP]
> Next time the blue dot takes a few seconds to settle down, remember what it's doing: listening to whispers from atomic clocks 20,000 km away, separating them from the noise, correcting for the atmosphere and for Einstein, and solving four equations at once, just so you can find the nearest coffee shop.
