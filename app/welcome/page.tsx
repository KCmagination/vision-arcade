import type { Metadata } from "next";
import { ArrowUpRight, Code2, Download, Mail, MessageCircle, Play, Shield, Swords, Landmark, Radio } from "lucide-react";
import { DeveloperDemo } from "@/components/developer-demo";
import { SentinelShowcase } from "@/components/sentinel-showcase";
import { BuildVisionLink, LandingHowLink, VisionWelcome } from "@/components/vision-welcome";
import "./welcome.css";

export const metadata: Metadata = {
  title: "Vi$ion Games — Gamified Budgeting and Financial Education",
  description: "Welcome to Vi$ion Games — Gamified Budgeting and Financial Education. Explore Cash Flow, Capital, Collateral, and Credit through your avatar and financial games.",
};

const contact = "mailto:rettkecomms@gmail.com";
const corners = [
  { id: "cash-flow", number: "01", title: "Cash Flow", icon: Swords, color: "flow", body: <>Understand the relationship between money coming in and money going out.</>, equipment: "Cash Flow → Weapon", mapping: "Less debt pressure relative to income means greater offensive strength." },
  { id: "capital", number: "02", title: "Capital", icon: Shield, color: "capital", body: <>Learn to think about savings and reserves not just as dollars, but as <strong>time</strong> — how long your resources can support you.</>, equipment: "Capital → Shield", mapping: "More months of available reserves means stronger protection." },
  { id: "collateral", number: "03", title: "Collateral", icon: Landmark, color: "collateral", body: <>Understand the relationship between what you own, what it is worth, and what you still owe against it.</>, equipment: "Collateral → Armor", mapping: "More equity relative to debt strengthens your armor." },
  { id: "credit", number: "04", title: "Credit", icon: Radio, color: "credit", body: <>Go beyond the score and understand credit as a way of communicating your borrowing history and financial behavior.</>, equipment: "Credit → Helm & Wings", mapping: "Your credit profile changes your avatar’s credit equipment and abilities." },
];

export default function Welcome() {
  return (
    <div className="vision-landing">
      <a className="vl-skip" href="#welcome-main">Skip to content</a>
      <header className="vl-header vl-wrap">
        <a className="vl-brand" href="/welcome" aria-label="Vi$ion landing page">VI<span>$</span>ION<span className="vl-brand-caption">READ YOUR MONEY.</span></a>
        <nav aria-label="Landing page navigation">
          <LandingHowLink>How It Works</LandingHowLink><a href="#about">About Casey</a><a href="#developers">Developers</a><a href="#support">Support</a>
        </nav>
        <BuildVisionLink className="vl-button vl-button-small">Build My Vi$ion <ArrowUpRight size={17} aria-hidden="true" /></BuildVisionLink>
      </header>

      <main id="welcome-main">
        <div className="vl-welcome-banner"><p className="vl-wrap"><strong>Welcome to Vi$ion Games</strong><span aria-hidden="true"> — </span><span>Gamified Budgeting and Financial Education</span></p></div>
        <section className="vl-hero vl-wrap" aria-labelledby="vl-title">
          <h1 id="vl-title">Vi$ion turns Cash Flow, Capital, Collateral, and Credit into a visual avatar and financial games so you can understand how the pieces of your financial life interact.</h1>
          <div className="vl-concepts" id="how-it-works" tabIndex={-1} aria-labelledby="corners-title">
            <span id="philosophy" />
            <h2 id="corners-title">How Vi$ion Works</h2>
            <div className="vl-corner-grid" id="four-corners">{corners.map(({ id, number, title, icon: Icon, color, body }) => <article className={`vl-corner vl-${color}`} id={id} key={id}><div className="vl-corner-top"><Icon size={28} strokeWidth={1.4} aria-hidden="true" /><span>{number}</span></div><h3>{title}</h3><p>{body}</p></article>)}</div>
          </div>
          <div className="vl-avatar-column">
            <figure className="vl-hero-art">
              <div className="vl-art-index"><span>THE FOUR CORNERS</span><span>ONE CONNECTED PICTURE</span></div>
              <SentinelShowcase />
              <div className="vl-art-label vl-art-flow"><Swords size={19} aria-hidden="true" /><span>01 / CASH FLOW</span></div>
              <div className="vl-art-label vl-art-capital"><Shield size={19} aria-hidden="true" /><span>02 / CAPITAL</span></div>
              <div className="vl-art-label vl-art-collateral"><Landmark size={19} aria-hidden="true" /><span>03 / COLLATERAL</span></div>
              <div className="vl-art-label vl-art-credit"><Radio size={19} aria-hidden="true" /><span>04 / CREDIT</span></div>
              <figcaption>Meet Sentinel. Explore your own four corners in the hangar.</figcaption>
            </figure>
            <div className="vl-avatar-actions">
              <BuildVisionLink className="vl-button">Build My Vi$ion <ArrowUpRight size={20} aria-hidden="true" /></BuildVisionLink>
              <a className="vl-preview-link vl-text-link" href="#play-preview"><Play size={15} aria-hidden="true" /> Watch the 30-second preview</a>
            </div>
          </div>
          <p className="vl-hero-note">An independent financial-literacy game project by Casey S. Rettke.</p>
        </section>

        <section className="vl-welcome-explanation vl-wrap vl-section" aria-label="Explore the four concepts together">
          <div className="vl-principle"><span>No single one tells the whole story.</span><p><strong>Read all four together and the picture becomes much clearer.</strong></p></div>
          <div className="vl-first-decision"><p>And once you can see the picture, you can start asking better questions:</p><ul className="vl-questions"><li>What happens if I pay this debt down?</li><li>Can I afford this purchase?</li><li>Would more reserves help me more than paying extra debt?</li><li>What changes if I use a Snowball instead of an Avalanche strategy?</li></ul><h3>That is the purpose of Vi$ion.</h3><p>Explore the tradeoffs; Vi$ion does not recommend a purchase or make financial decisions for you.</p></div>
        </section>

        <section className="vl-connections vl-wrap vl-section" id="connections" aria-labelledby="connections-title">
          <div className="vl-section-heading"><p className="vl-kicker">02 / BUILD YOUR AVATAR</p><h2 id="connections-title">Build Your Avatar</h2><p>Start with <strong>seven basic inputs</strong> about your current financial situation.</p><p>Planning a purchase? Open <strong>What If</strong> for five additional inputs and compare the scenario without changing your current picture.</p></div>
          <p className="vl-avatar-intro">The Vi$ion analogy engine connects each of the four financial concepts to part of your avatar:</p>
          <div className="vl-connection-grid">{corners.map(({ id, color, equipment, mapping }) => <article className={`vl-connection vl-${color}`} key={id}><h3>{equipment}</h3><p>{mapping}</p></article>)}</div>
          <p className="vl-level-note">These equipment names describe Sentinel. The hangar labels its credit headpiece “Antenna”; credit also changes its wings. Verdant expresses the same four concepts through leaves, trunk, roots, and canopy. Cash-flow strength includes living expenses as well as debt payments.</p>
          <div className="vl-principle"><span>The point isn’t to make a “good” or “bad” character.</span><p>The avatar gives you a way to see financial relationships that are normally trapped inside spreadsheets, percentages, and credit reports.</p></div>
          <div className="vl-actions"><BuildVisionLink className="vl-button">Build My Vi$ion <ArrowUpRight size={19} aria-hidden="true" /></BuildVisionLink></div>
        </section>

        <section className="vl-play-band" id="games" aria-labelledby="games-title">
          <div className="vl-wrap vl-play-inner">
            <div>
              <p className="vl-kicker">03 / THEN PLAY YOUR FINANCIAL PICTURE</p>
              <h2 id="games-title">Your avatar isn’t<br />just decoration.</h2>
              <p>Take it into Vi$ion’s financial simulators and see those same concepts become gameplay.</p>
              <p>Battle debt. Protect your reserves. Survive until payday.</p>
              <p>Debtbreaker uses your selected hangar picture for monthly obligations and reserve protection. It does not project principal payoff, interest, or credit-score changes.</p>
              <ol className="vl-loop" aria-label="The Vi$ion decision loop"><li>Read</li><li>Allocate</li><li>Predict</li><li>Play</li><li>Review</li></ol>
              <div className="vl-classic-note"><h3>Debtbreak Classic · fictional practice scenarios</h3><p>Reduce <strong>principal balances</strong>. Experiment with different debt strategies such as <strong>Avalanche and Snowball</strong> and watch how the same starting situation can produce very different results.</p><p>Open <strong>Classic</strong> inside Debtbreaker to try these separate scenarios; they do not model your personal account balances.</p></div>
              <p>The games don’t make financial decisions for you. <strong>They give you a place to see those decisions happen.</strong></p>
              <p className="vl-small">Educational simulation. Gameplay does not move real money or change real accounts.</p>
              <a className="vl-button vl-play-cta" href="/#arcade">Enter the arcade <ArrowUpRight size={19} aria-hidden="true" /></a>
            </div>
            <figure className="vl-game-preview" id="play-preview">
              <video controls playsInline preload="none" poster="/media/vision-preview-poster.jpg" aria-label="Vi$ion: Read, decide, play — 30-second preview" aria-describedby="preview-caption">
                <source src="/media/vision-read-decide-play.mp4" type="video/mp4" />
                <track kind="captions" src="/media/vision-read-decide-play.vtt" srcLang="en" label="English" />
                <a href="/media/vision-read-decide-play.mp4">Download the Vi$ion preview</a>
              </video>
              <figcaption id="preview-caption">30 seconds · Caption-led with music.<br />Gameplay clips show an earlier prototype.</figcaption>
              <details className="vl-video-transcript"><summary>Read the preview transcript</summary><p>Can you read your money? Start with four corners: cash flow — what remains; capital — your reserves; collateral — value and costs; credit — your borrowing record. First, read where you stand.</p><p>Choose where your money goes. In Debtbreak, landed shots spend your debt budget. Reserve strikes spend your savings.</p><p>Read. Decide. Play. Start with a fictional household, try a plan and see what changes.</p></details>
            </figure>
          </div>
        </section>

        <section className="vl-about vl-wrap vl-section" id="about" aria-labelledby="about-title">
          <div><p className="vl-kicker">04 / ABOUT ME</p><h2 id="about-title">Casey S.<br />Rettke<span>.</span></h2><p className="vl-byline">Vi$ion creator · New Hampshire</p><div className="vl-background"><span>23 years</span><p>of experience in mortgage lending</p></div><dl className="vl-credentials"><div><dt>Community lending</dt><dd>Former Community Reinvestment Act Lending Officer, Citizens Bank</dd></div><div><dt>Education &amp; outreach</dt><dd>Financial-literacy materials, classes and counselor training</dd></div><div><dt>Communications</dt><dd>B.S. in Mass Communication / Public Relations, University of Idaho</dd></div></dl><a className="vl-text-link" href="https://x.com/KcMagination" target="_blank" rel="noopener noreferrer">@KcMagination on X <ArrowUpRight size={17} aria-hidden="true" /></a></div>
          <div className="vl-about-copy"><p className="vl-large">I’ve built wealth, lost it, and had to learn how to rebuild.</p><p>During the early-2000s mortgage boom, I built substantial wealth. A real-estate deal I trusted left me with overwhelming debt and the loss of my home and much of the life I had built. Financial success had not made me immune to financial failure.</p><p>I spent a year working directly with the IRS to resolve a major tax debt. Rebuilding meant understanding where I actually stood, working through my obligations and having difficult conversations. Progress came one decision at a time.</p><p>I eventually rebuilt my personal life, met my wife and became a father. Through my work as a Community Reinvestment Act loan officer at Citizens Bank, I volunteered with a nonprofit housing-counseling agency. I wrote educational material, taught classes and helped train counselors. I also contributed to research and development for lending products designed to serve people with low and moderate incomes.</p><p>Health challenges later forced me to step away from lending. Rebuilding remains part of my life. Today, I use AI as a tool for learning and creating, and Vi$ion is one way I continue to contribute.</p><p>That experience is why Vi$ion starts with a practical first step: read your four corners and understand where you are now. Make decisions from those facts. Then learn how the corners affect one another.</p><p className="vl-story-takeaway">Financial literacy cannot erase hardship. It can give you a clearer picture to work from.</p><a className="vl-text-link" href={`${contact}?subject=Hello%20Casey%20%E2%80%94%20Vi%24ion`}>Get in touch <Mail size={18} aria-hidden="true" /></a></div>
        </section>

        <section className="vl-developers vl-wrap vl-section" id="developers" aria-labelledby="developer-title"><div className="vl-developer-heading"><div><p className="vl-kicker">05 / FOR DEVELOPERS</p><h2 id="developer-title">Your game.<br />The Vi$ion engine.</h2></div><div><p>Build a different world around the same four corners. Send aggregate financial inputs to the hosted API; receive current and scenario signals for your own gameplay.</p><p>The arcade client is open source under MIT. The financial calculator is a separate, private engine.</p></div></div><DeveloperDemo /><div className="vl-developer-links"><a className="vl-text-link" href="https://github.com/KCmagination/vision-arcade/blob/main/docs/CALCULATOR_API.md" target="_blank" rel="noopener noreferrer">Read the API guide <ArrowUpRight size={17} aria-hidden="true" /></a><a className="vl-text-link" href="https://github.com/KCmagination/vision-arcade" target="_blank" rel="noopener noreferrer"><Code2 size={18} aria-hidden="true" /> Browse the public source</a><a className="vl-text-link" href={`${contact}?subject=Vi%24ion%20developer%20collaboration`}>Discuss an integration <Mail size={17} aria-hidden="true" /></a></div><p className="vl-small vl-api-note">Experimental public API · No key currently required · No availability guarantee. The public repository is a separate release and may lag the live games. Preserve unknown values as unknown; the engine does not predict future credit scores. Use the API guide for input limits and responsible integration.</p></section>

        <section className="vl-support vl-wrap vl-section" id="support" aria-labelledby="support-title"><p className="vl-kicker">06 / HELP BUILD WHAT COMES NEXT</p><div className="vl-support-heading"><h2 id="support-title">Make financial<br />understanding<br /><em>more accessible.</em></h2><p>Interested in supporting Vi$ion? I welcome conversations with educators, housing counselors, credit unions, game developers and people who want to help this project grow.</p></div><div className="vl-support-options"><a href={`${contact}?subject=Vi%24ion%20education%20pilot`}><MessageCircle size={23} aria-hidden="true" /><h3>Explore an education pilot</h3><p>Talk about using the prototype with your learners or community.</p><span>Start a conversation <ArrowUpRight size={17} aria-hidden="true" /></span></a><a href={`${contact}?subject=Supporting%20Vi%24ion`}><Landmark size={23} aria-hidden="true" /><h3>Support development</h3><p>Discuss funding, grant opportunities, sponsorship or practical support.</p><span>Discuss support <ArrowUpRight size={17} aria-hidden="true" /></span></a><a href={`${contact}?subject=Contributing%20to%20Vi%24ion`}><Code2 size={23} aria-hidden="true" /><h3>Contribute your skills</h3><p>Bring game design, accessibility, teaching experience or playtesting feedback.</p><span>Introduce yourself <ArrowUpRight size={17} aria-hidden="true" /></span></a></div><a className="vl-contact-email" href={contact}>rettkecomms@gmail.com <ArrowUpRight aria-hidden="true" /></a><p className="vl-small">Contact Casey directly. Support and pilot arrangements are discussed individually.</p></section>
        <section className="vl-pilot vl-wrap" id="pilot" aria-labelledby="pilot-title">
          <div><p className="vl-kicker">TRY IT WITH YOUR COMMUNITY</p><h2 id="pilot-title">One session.<br />A clearer picture.</h2><p>Educators, counselors and adult beta testers can start with a 30-minute session using fictional households. Compare two incomes, make a plan and tell us what became clearer.</p><p className="vl-small">Early pilot materials. Partner participation and learning outcomes are still being explored.</p></div>
          <div className="vl-pilot-downloads">
            <a href="/resources/Vision-Pilot-Brief.pdf" download><span><strong>The pilot at a glance</strong><small>1-page PDF · Purpose, proposed pilot and support</small></span><Download size={22} aria-hidden="true" /></a>
            <a href="/resources/Vision-Facilitator-Kit.pdf" download><span><strong>Run a first session</strong><small>6-page PDF · Worksheets, answer key and feedback guide</small></span><Download size={22} aria-hidden="true" /></a>
            <a className="vl-text-link" href={`${contact}?subject=Vi%24ion%20pilot%20conversation`}>Talk with Casey about a pilot <ArrowUpRight size={17} aria-hidden="true" /></a>
          </div>
        </section>
      </main>
      <VisionWelcome landing />
      <footer className="vl-footer vl-wrap"><a className="vl-brand" href="/welcome">VI<span>$</span>ION</a><p>Financial awareness through play.<br /><span>Educational prototype. Games do not change real finances.</span></p><a href="/#arcade">Play Vi$ion Games <ArrowUpRight size={17} aria-hidden="true" /></a><span className="vl-copyright">© 2026 Casey S. Rettke</span></footer>
    </div>
  );
}
