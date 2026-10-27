export const pages = {
  about: () => `
<div class="portfolio-inner">
  <h1>James Lee</h1>
  <div class="about-summary">
    <p>
      My background combines information systems, computer science, and quantitative research. I’ve
      worked on AI-assisted workflows, personalized consumer products, and financial prediction
      models.
    </p>
  </div>
  <h2>Education</h2>
  <p>
    <strong>Carnegie Mellon University</strong><br />B.S. in Information Systems, double major in
    Computer Science<br /><span class="tag-list">AUGUST 2022 – MAY 2026</span>
  </p>
  <p>
    Coursework: Data Structures &amp; Algorithms, Database Design, Computer Vision, and Probability
    Theory.
  </p>
  <h2>Skills</h2>
  <div class="skills-grid">
    <div><strong>Languages</strong>Python · SQL · R · JavaScript<br />TypeScript · MATLAB</div>
    <div><strong>Machine learning</strong>PyTorch · scikit-learn<br />XGBoost · LightGBM</div>
    <div>
      <strong>Data &amp; analysis</strong>NumPy · Pandas · statsmodels<br />Time-series validation ·
      Backtesting
    </div>
    <div>
      <strong>Cloud &amp; infrastructure</strong>AWS: Bedrock, S3, Lambda, SQS, SNS<br />Docker ·
      GCP
    </div>
  </div>
  <h2>Activities</h2>
  <p>I placed in the top 5 of 97 participants at the 2025 CMU Poker Club × Jump Trading event.</p>
  <p><a href="James_Lee_Resume.pdf" target="_blank" rel="noopener">Read my full résumé ↗</a></p>
</div>
`,
  experience: () => `
<div class="portfolio-inner">
  <h1>Experience</h1>
  <article class="experience-entry">
    <h2>Amazon</h2>
    <b>Software Engineer Intern</b>
    <div class="tag-list">MAY – AUGUST 2025 · BELLEVUE, WA</div>
    <ul>
      <li>
        Created a RAG chatbot with an S3 knowledge base and the Claude API to translate user stories
        into MVEL rules.
      </li>
      <li>
        Built a validation sandbox that backtested rule logic on historical data to prevent false
        alerts before production.
      </li>
      <li>
        Scaled rule deployment 4×, from 50 to 200+ rules, reducing manual rule-creation bottlenecks.
      </li>
    </ul>
  </article>
  <article class="experience-entry">
    <h2>Forge Rewards · Y Combinator</h2>
    <b>Software Engineer Intern</b>
    <div class="tag-list">MAY – AUGUST 2024 · PALO ALTO, CA</div>
    <ul>
      <li>Scaled a mobile loyalty platform helping small businesses retain customers.</li>
      <li>
        Built an XGBoost uplift model to prevent notification fatigue and a DynamoDB backend for
        real-time point tracking.
      </li>
      <li>
        Generated $100K+ in merchant revenue through A/B-tested targeted campaigns that improved
        purchase frequency.
      </li>
    </ul>
  </article>
  <article class="experience-entry">
    <h2>CMU Tartan Student Fund</h2>
    <b>Undergraduate Analyst</b>
    <div class="tag-list">JANUARY 2023 – AUGUST 2024 · PITTSBURGH, PA</div>
    <ul>
      <li>
        Pitched Costco after identifying membership fees as an undervalued recurring revenue stream.
      </li>
      <li>
        Built a valuation model isolating membership revenue and its contribution to downside
        protection.
      </li>
      <li>
        The position returned 89% over 22 months, compared with 51% for the S&amp;P over that
        period.
      </li>
    </ul>
  </article>
  <article class="experience-entry">
    <h2>LIKELION</h2>
    <b>Teaching Assistant · Tech Entrepreneurship Club</b>
    <div class="tag-list">SEPTEMBER – OCTOBER 2023 · PITTSBURGH, PA</div>
    <ul>
      <li>
        Developed a machine-learning curriculum covering PyTorch, CNNs, and deployment for 20+
        students.
      </li>
      <li>
        Mentored a winning hackathon team building an RCNN/ResNet50 image classifier using a Kaggle
        lunar crater dataset.
      </li>
    </ul>
  </article>
  <article class="experience-entry">
    <h2>Carnegie Mellon University</h2>
    <b>Quant Finance Research</b>
    <div class="tag-list">JUNE – JULY 2023 · PITTSBURGH, PA</div>
    <ul>
      <li>
        Built an options-pricing simulator comparing risk-neutral valuation and real-world
        profitability across three binomial models.
      </li>
      <li>
        Used CRR, Shreve, and drift-adjusted engines with 1,000+ Monte Carlo paths to validate
        convergence.
      </li>
      <li>
        Developed a strike-optimization algorithm with a 500+ combination grid search and an
        interactive Streamlit interface.
      </li>
    </ul>
  </article>
</div>
`,
  projects: () => `
<div class="portfolio-inner">
  <h1>Projects</h1>
  <article class="project-row">
    <div>
      <h2>Jane Street Market Prediction</h2>
      <div class="tag-list">KAGGLE · XGBOOST · AUTOENCODER / MLP</div>
      <p>
        Built an ensemble to predict profitable trades using 500 days of high-frequency trading
        data. Combined XGBoost’s nonlinear feature modeling with an autoencoder to separate signal
        from noise.
      </p>
      <p>
        Reduced 130 features to 26 while preserving 95% of variance. Included transaction costs and
        time-series cross-validation to prevent lookahead bias.
      </p>
    </div>
  </article>
  <article class="project-row">
    <div>
      <h2>Two Sigma Financial Market Prediction</h2>
      <div class="tag-list">KAGGLE · LIGHTGBM · NLP · OPTUNA</div>
      <p>
        Built a LightGBM classifier for 10-day stock returns using price history and news sentiment.
        Chose gradient boosting to handle sparse news coverage with 30% missing data.
      </p>
      <p>
        Tuned the model with Bayesian optimization across 50+ Optuna trials and validated
        predictions using walk-forward backtesting.
      </p>
    </div>
  </article>
  <article class="project-row">
    <div>
      <h2>Options Pricing Simulator</h2>
      <div class="tag-list">CMU RESEARCH · MONTE CARLO · STREAMLIT</div>
      <p>
        Compared three binomial pricing engines with real-world profitability, validated convergence
        across 1,000+ simulated paths, and explored 500+ strike combinations in an interactive
        interface.
      </p>
      <button class="link-button" data-page="experience">Read about the research →</button>
    </div>
  </article>
  <p>
    <a href="https://github.com/jaylee-ny" target="_blank" rel="noopener noreferrer"
      >Explore my GitHub profile ↗</a
    >
  </p>
</div>
`,
  contact: () => `
<div class="portfolio-inner">
  <h1>Contact</h1>
  <a class="contact-link" href="mailto:jamesjlee.ny@gmail.com">jamesjlee.ny@gmail.com</a
  ><a class="contact-link" href="tel:+12019735357">(201) 973-5357</a
  ><a
    class="contact-link"
    href="https://github.com/jaylee-ny"
    target="_blank"
    rel="noopener noreferrer"
    >GitHub / jaylee-ny ↗</a
  ><a
    class="contact-link"
    href="https://linkedin.com/in/james-lee02"
    target="_blank"
    rel="noopener noreferrer"
    >LinkedIn / James Lee ↗</a
  >
  <div class="home-rule" style="margin: 30px 0; width: 100%"></div>
  <p>
    <a href="James_Lee_Resume.pdf" download="James_Lee_Resume.pdf">Download my résumé (PDF) ↓</a>
  </p>
</div>
`,
  resume: () => `
<div class="portfolio-inner">
  <h1>Résumé</h1>
  <h2>James Lee</h2>
  <p>
    B.S. in Information Systems, double major in Computer Science<br />Carnegie Mellon University ·
    August 2022 – May 2026
  </p>
  <p>
    Experience at Amazon, Forge Rewards, CMU Tartan Student Fund, LIKELION, and Carnegie Mellon
    University.
  </p>
  <div class="resume-actions">
    <a class="mac-button" href="James_Lee_Resume.pdf" target="_blank" rel="noopener">View PDF ↗</a
    ><a class="mac-button" href="James_Lee_Resume.pdf" download="James_Lee_Resume.pdf"
      >Download PDF ↓</a
    >
  </div>
  <p>Includes my full experience, research, projects, technical skills, and contact information.</p>
  <div class="home-rule" style="margin: 28px 0; width: 100%"></div>
  <p>
    <a href="mailto:jamesjlee.ny@gmail.com">jamesjlee.ny@gmail.com</a> ·
    <a href="https://github.com/jaylee-ny" target="_blank" rel="noopener noreferrer">GitHub ↗</a> ·
    <a href="https://linkedin.com/in/james-lee02" target="_blank" rel="noopener noreferrer"
      >LinkedIn ↗</a
    >
  </p>
</div>
`,
};
