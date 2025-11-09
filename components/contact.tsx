"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"

const Contact = () => {
    const [email, setEmail] = useState("")
    const [submitted, setSubmitted] = useState(false)

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()

        const to = "connect@muralianand.in"
        const subject = "Website contact"
        const body = email ? `Hello,%0D%0A%0D%0AMy email: ${email}%0D%0A%0D%0A` : "Hello,%0D%0A%0D%0A"
        const mailto = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${body}`

        try {
            window.location.href = mailto
        } catch (err) {
            console.error("Failed to open mail client", err)
        }

        setSubmitted(true)
        setEmail("")
        setTimeout(() => setSubmitted(false), 3000)
    }

    return (
        <section id="contact" className="py-20 px-4 sm:px-6 lg:px-8 bg-black">
            <div className="max-w-2xl mx-auto text-center">
                <h2 className="text-4xl font-bold mb-6">Let's Create Together</h2>
                <p className="text-white/70 mb-12">
                    Have an AI project or collaboration in mind? I'd love to hear about it. Reach out and let's build something
                    amazing.
                </p>

                <div className="mb-8">
                    <a
                        href="mailto:connect@muralianand.in"
                        className="text-lg font-semibold hover:text-white transition-colors underline"
                    >
                        connect@muralianand.in
                    </a>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto items-center">
                    <input
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-full text-white placeholder:text-white/50 focus:outline-none focus:border-white/50 transition-colors h-12"
                    />
                    <Button type="submit" className="bg-white text-black hover:bg-white/90 rounded-full px-8 h-12">
                        {submitted ? "Sent!" : "Send"}
                    </Button>
                </form>

                {submitted && <p className="text-white/70 mt-4 text-sm">Thanks for reaching out! I'll get back to you soon.</p>}
            </div>
        </section>
    )
}

export default Contact
