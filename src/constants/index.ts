import { PredefinedResponses } from "@/types";

const intro = `
Hello! 👋🏻

I'm <span class='bold'><a class='alink'>Murali Anand</a></span>, a software developer specializing in LLM-based applications and backend software.

My passion lies in exploring the practical applications of AI, and I prioritize staying updated with the latest advancements in the field.

I'm excited to contribute my skills and knowledge to innovative projects and collaborations within the AI domain.

If you're curious to learn more about me, feel free to send <span class='bold'>'help'</span>.
`.replace(/\n/g, "<br>");

const help = `
<span class='sk'>
Send Keyword to get what you want to know about me...
e.g
<span class='bold'>'skills'</span> - to know my skills
<span class='bold'>'resume'</span> - to get my resume
<span class='bold'>'education'</span> - to get my education details
<span class='bold'>'contact'</span> - to get ways to connect with me
<span class='bold'>'projects'</span> - to get details of my projects
<span class='bold'>'clear'</span> - to clear conversation
</span>
`.replace(/\n/g, "<br>");

const resume = `
<img src='images/resumeThumbnail.png' class='resumeThumbnail'>
<div class='downloadSpace'>
    <div class='pdfname'>
        <img src='images/pdf.png'>
        <label>MuraliResume.pdf</label>
    </div>
    <a href='assets/MuraliResume.pdf' download='Murali_Resume.pdf' type='application/pdf'>
        <img class='download' src='images/downloadIcon.svg'>
    </a>
</div>
`.replace(/\n/g, "");

const skills = `
<span class='sk'>
I am currently working at Talentship.io. I'm working on projects involving Artificial Intelligence and LLM-based applications.

I can comfortably write code in the following languages:
<span class='bold'>
Python
JavaScript/TypeScript
</span>

I have experience with:
<span class='bold'>
Node.js
MongoDB
AWS
SQL
Linux
TensorFlow
Langchain and LlamaIndex
</span>

I use an <span class='bold'>Apple MacBook Pro M3</span> for my application development. My favorite IDE is VSCode.
</span>
`.replace(/\n/g, "<br>");

const education = `
I am currently working at Talentship.io (TSI). I completed my B.Tech degree in Computer Science Engineering from SRIHER in 2024. I finished my secondary schooling at Maharishi Vidya Mandir in 2020.
`;

const contact = `
<div class='social'>
    <a target='_blank' href='tel:+919384334800'>
        <div class='socialItem' id='call'>
            <img class='socialItemI' src='images/phone.svg'/>
            <label class='number'>9384334800</label>
        </div>
    </a>
    <a href='mailto:smurali1607@gmail.com'>
        <div class='socialItem'>
            <img class='socialItemI' src='images/gmail.svg' alt=''>
        </div>
    </a>
    <a target='_blank' href='https://github.com/muralianand12345'>
        <div class='socialItem'>
            <img class='socialItemI' src='images/github.svg' alt=''>
        </div>
    </a>
    <a target='_blank' href='https://wa.me/919384334800'>
        <div class='socialItem'>
            <img class='socialItemI' src='images/whatsapp.svg' alt=''>
        </div>
    </a>
    <a target='_blank' href='https://t.me/Murali_Anand'>
        <div class='socialItem'>
            <img class='socialItemI' src='images/telegram.svg' alt=''>
        </div>
    </a>
    <a target='_blank' href='https://www.instagram.com/ig_mur.lee/'>
        <div class='socialItem'>
            <img class='socialItemI' src='images/instagram.svg' alt=''>
        </div>
    </a>
    <a href='www.linkedin.com/in/murali-anand' target='_blank' rel='noopener noreferrer'>
        <div class='socialItem'>
            <img class='socialItemI' src='images/linkedin.svg' alt=''>
        </div>
    </a>
</div>
`.replace(/\n\s+/g, "");

const projects = `
You want to check my projects? Then just jump into my Github Account.

<div class='social'>
    <a target='_blank' href='https://github.com/muralianand12345'>
        <div class='socialItem'>
            <img class='socialItemI' src='images/github.svg' alt=''>
        </div>
    </a>
</div>
`.replace(/\n/g, "<br>");

export const predefinedResponses: PredefinedResponses = {
    intro,
    help,
    resume,
    skills,
    education,
    contact,
    projects,
};
