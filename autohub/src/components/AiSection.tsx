import Link from "next/link";

export default function AiSection() {
  return (
    <div className="ai-section">
      <div className="ai-left">
        <h1 className="how-it">How it works</h1>
        <h2>
          The Easiest Way to
          <br />
          Find Your Next Car
        </h2>
        <Link href="#">Get Started</Link>
      </div>
      <div className="ai-right">
        <div className="ai-feature">
          <div className="ai-icon">
            <img src="/icons/chatbot-icon.png" alt="Chatbot" />
          </div>
          <h3>Use turbo bot</h3>
          <p>
            Turbo Bot is an AI chatbot that gives you quick car recommendations, information, and support while you use the website.
          </p>
        </div>
        <div className="ai-feature">
          <div className="ai-icon">
            <img src="/icons/qustion.png" alt="Question" />
          </div>
          <h3>Answer the questions</h3>
          <p>The chatbot asks questions, analyzes your answers, and recommends the best car options for you.</p>
        </div>
        <div className="ai-feature">
          <div className="ai-icon">
            <img src="/icons/camera.png" alt="Camera" />
          </div>
          <h3>Use Auto Detector</h3>
          <p>Capture any car with your camera and let our AI instantly identify its make and model.</p>
        </div>
      </div>
    </div>
  );
}
