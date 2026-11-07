export type Locale = "ja" | "en";

export type LinkItem = {
  label: string;
  href: string;
};

export type WorkItem = {
  title: string;
  summary: string;
  fit: string;
  stack: string;
  scope: string;
  outcome: string;
};

export type CareerItem = {
  period: string;
  startYear: number;
  endYear: number;
  company: string;
  /** A period presented as a project lead rather than as an employer. */
  project?: boolean;
  role: string;
  summary: string;
  details: string[];
  stack: string;
};

/** Small ink emblem drawn beside each product in the grimoire. */
export type ProductEmblem = "lens" | "quill" | "prism" | "branch";

export type ProductItem = {
  id: string;
  name: string;
  kind: string;
  status: string;
  tagline: string;
  highlights: string[];
  role: string;
  stack: string[];
  /** The first link is the product's primary destination. */
  links: LinkItem[];
  emblem: ProductEmblem;
};

export type SkillGroup = {
  area: string;
  items: string[];
  evidence: string;
};

export type CaseStudy = {
  title: string;
  organization: string;
  period?: string;
  role: string;
  summary: string;
  highlights: string[];
  stack: string[];
};

export type SiteContent = {
  meta: {
    title: string;
    description: string;
    profileTitle: string;
    profileDescription: string;
  };
  navigation: {
    products: string;
    skills: string;
    caseStudies: string;
    career: string;
    work: string;
    contact: string;
  };
  hero: {
    eyebrow: string;
    role: string;
    lead: string;
    introduction: string;
    craft: string;
    availability: string;
    experienceLabel: string;
    experienceValue: string;
    locationLabel: string;
    locationValue: string;
    focusLabel: string;
    focusValue: string;
    communicationLabel: string;
    communicationValue: string;
  };
  sections: {
    productsKicker: string;
    productsTitle: string;
    productsIntro: string;
    skillsKicker: string;
    skillsTitle: string;
    skillsIntro: string;
    caseStudiesKicker: string;
    caseStudiesTitle: string;
    caseStudiesIntro: string;
    careerKicker: string;
    careerTitle: string;
    careerIntro: string;
    workKicker: string;
    workTitle: string;
    workIntro: string;
    contactKicker: string;
    contactTitle: string;
    contactIntro: string;
    contactLetter: string;
  };
  labels: {
    fit: string;
    stack: string;
    scope: string;
    outcome: string;
    role: string;
    evidence: string;
    project: string;
    readInFull: string;
    viewGrimoire: string;
    language: string;
    updated: string;
  };
  products: ProductItem[];
  skills: SkillGroup[];
  caseStudies: CaseStudy[];
  work: WorkItem[];
  career: CareerItem[];
};

/** Public profiles, shared by every page and locale. */
export const SOCIAL_LINKS: LinkItem[] = [
  { label: "GitHub", href: "https://github.com/Ischca" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/shota-watanabe-16547a20b/" },
  { label: "Upwork", href: "https://www.upwork.com/freelancers/~01a8bd9fc4315f48e2" },
  { label: "X", href: "https://x.com/ischca" },
];

/** Date shown on the full profile page; update it together with the content. */
export const CONTENT_UPDATED = "2026-11-07";

export const siteContent: Record<Locale, SiteContent> = {
  ja: {
    meta: {
      title: "Ischca — バックエンドを軸にプロダクトを作るソフトウェアエンジニア",
      description:
        "ソフトウェアエンジニア Ischca のポートフォリオ。個人で開発・運営するプロダクト（KUE、Storiiva、PrismDiff、Restrict Language）と、実務で使ってきた技術を紹介しています。",
      profileTitle: "プロダクト・技術・経歴 — Ischca",
      profileDescription:
        "Ischca が個人で開発・運営するプロダクト（KUE、Storiiva、PrismDiff、Restrict Language）、実務と個人開発で使ってきた技術、主な仕事と経歴をまとめたページです。",
    },
    navigation: {
      products: "プロダクト",
      skills: "技術",
      caseStudies: "主な仕事",
      career: "経歴",
      work: "対応できる仕事",
      contact: "連絡先",
    },
    hero: {
      eyebrow: "Software Engineer · Tokyo",
      role: "ソフトウェアエンジニア（バックエンド / フルスタック）",
      lead: "バックエンドを軸に、プロダクトの設計・実装・運用までを担当するソフトウェアエンジニアです。",
      introduction:
        "2016年から、業務システムとコンシューマープロダクトの設計・実装・運用に携わっています。API、データ、パフォーマンスの問題を中心に、必要に応じてフロントエンド、モバイル、クラウドまで担当します。",
      craft: "TypeScript · Kotlin · Go · Scala · Ruby · Rust · AWS · GCP · Terraform",
      availability:
        "業務委託（パートタイム・継続）で、バックエンドや開発基盤のお仕事をお受けしています。やり取りは、GitHub、Slack、ドキュメントを使った非同期のテキストで行います。",
      experienceLabel: "実務経験",
      experienceValue: "10年以上",
      locationLabel: "拠点",
      locationValue: "東京",
      focusLabel: "主軸",
      focusValue: "Backend / Data / Cloud",
      communicationLabel: "やり取り",
      communicationValue: "非同期・テキスト中心",
    },
    sections: {
      productsKicker: "Products",
      productsTitle: "つくったもの",
      productsIntro: "個人で設計・開発し、公開・運営しているプロダクトです。",
      skillsKicker: "Skills",
      skillsTitle: "技術",
      skillsIntro: "実務と個人開発で使ってきた技術を、使った場面とあわせて載せています。",
      caseStudiesKicker: "Selected work",
      caseStudiesTitle: "主な仕事",
      caseStudiesIntro: "これまでに設計・開発を担当した、主なシステムです。",
      careerKicker: "Career",
      careerTitle: "経歴",
      careerIntro: "所属と役割を、新しいものから順に載せています。",
      workKicker: "Services",
      workTitle: "対応できる仕事",
      workIntro: "既存システムを読み解き、サービスを止めずに改善する仕事を中心にお受けしています。",
      contactKicker: "Contact",
      contactTitle: "連絡先",
      contactIntro: "ご相談は、LinkedIn または Upwork からテキストでお送りください。",
      contactLetter:
        "業務委託（パートタイム・継続）のお仕事をお受けしています。ご相談は、LinkedIn または Upwork からテキストでお送りください。",
    },
    labels: {
      fit: "向いている案件",
      stack: "主な技術",
      scope: "対応範囲",
      outcome: "成果物",
      role: "担当",
      evidence: "使った場面",
      project: "プロジェクト",
      readInFull: "全文を読む",
      viewGrimoire: "魔導書で見る",
      language: "English",
      updated: "最終更新",
    },
    products: [
      {
        id: "kue",
        name: "KUE",
        kind: "モバイルアプリ向け SDK・SaaS",
        status: "SDK・CLI v0.6.0 · MIT",
        tagline:
          "実機テストで見つけた不具合や UI の気づきを、スクリーンショットとメモ付きの GitHub Issue として登録できるツールです。",
        highlights: [
          "Expo / React Native、ネイティブの iOS・Android、Flutter のアプリに導入できます。",
          "SDK は npm、Swift Package Manager、Maven Central、pub.dev から配布しています。",
          "報告の送り先は、アプリ側の保存処理か、GitHub Issue を作成する KUE Cloud から選べます。",
        ],
        role: "SDK とセットアップ CLI を開発し、ホスト型サービスの KUE Cloud とあわせて提供しています。",
        stack: ["Swift", "Kotlin", "TypeScript", "Dart"],
        links: [
          { label: "サイト", href: "https://kue.ischca.dev/" },
          { label: "ドキュメント", href: "https://kue.ischca.dev/docs" },
          { label: "GitHub", href: "https://github.com/Ischca/kue" },
        ],
        emblem: "lens",
      },
      {
        id: "storiiva",
        name: "Storiiva",
        kind: "Web 小説投稿サービス",
        status: "運営中",
        tagline: "生成 AI を活用した作品も投稿できる、無料の Web 小説投稿・読書サイトです。",
        highlights: [
          "読者は、アカウントを作らずに公開エピソードを読めます。",
          "多言語での作品公開と、作品探しに対応しています。",
          "ランキングや新着一覧から、ジャンルごとに作品を探せます。",
        ],
        role: "企画から開発、運営までを個人で担当しています。",
        stack: ["Next.js", "TypeScript", "Supabase", "LLM"],
        links: [{ label: "サイト", href: "https://storiiva.com/ja" }],
        emblem: "quill",
      },
      {
        id: "prismdiff",
        name: "PrismDiff",
        kind: "macOS アプリ",
        status: "v1.0.6 · 署名・公証済み",
        tagline:
          "AI が書いたコードを手元の差分でレビューし、指摘をそのままエージェントへ返せるデスクトップアプリです。",
        highlights: [
          "MCP を通じて、エージェントの指摘を差分の該当行に表示し、返信をエージェントへ戻します。",
          "空白の変更やインポートの移動を畳み、意味のある変更に集中できます。",
          "ブランチ、worktree、GitHub のプルリクエストを手元でレビューできます。",
        ],
        role: "設計・開発から、署名付きアプリの配布までを個人で担当しています。",
        stack: ["Rust", "Tauri", "React", "MCP"],
        links: [{ label: "サイト", href: "https://ischca.github.io/prismdiff/" }],
        emblem: "prism",
      },
      {
        id: "restrict",
        name: "Restrict Language",
        kind: "プログラミング言語",
        status: "v0.0.1 · MIT",
        tagline: "データを先に、操作を後に書く、WebAssembly 向けのプログラミング言語です。",
        highlights: [
          "引数が先、関数が後に来る OSV 語順で、値の流れを書いた順に読めます。",
          "アフィン型の検査で、移動済みの値をうっかり再利用するミスを防ぎます。",
          "ブラウザで動くプレイグラウンド、LSP、VS Code 拡張を用意しています。",
        ],
        role: "言語仕様、コンパイラ、エディタ支援までを個人で開発しています。",
        stack: ["Rust", "WebAssembly", "LSP"],
        links: [
          { label: "サイト", href: "https://ischca.github.io/restrict_lang/" },
          { label: "GitHub", href: "https://github.com/Ischca/restrict_lang" },
        ],
        emblem: "branch",
      },
    ],
    skills: [
      {
        area: "バックエンド / API",
        items: ["Ruby on Rails", "Scala / Play Framework", "Kotlin / Ktor", "Go / Gin", "Node.js", "GraphQL"],
        evidence: "AppBrew（Rails・GraphQL）、Creatures（Play・Gin）、ClinCloud（Ktor）、HashPort（TypeScript）",
      },
      {
        area: "フロントエンド",
        items: ["TypeScript", "React", "Next.js", "Angular", "Aurelia"],
        evidence: "Creatures（Angular の刷新）、Storiiva（Next.js）、ClinCloud（JSF・jQuery から Aurelia への移行）",
      },
      {
        area: "データ",
        items: ["MySQL", "Redis", "Supabase"],
        evidence: "AppBrew（GraphQL の N+1 改善）、Creatures（データベース最適化・バッチ処理）、Storiiva（Supabase）",
      },
      {
        area: "クラウド / インフラ",
        items: ["AWS", "GCP / GKE", "Kubernetes", "Docker", "Terraform"],
        evidence: "ClinCloud（GCP から AWS への移行・Docker 化）、Creatures（GKE・Terraform）、AppBrew（AWS・GCP）",
      },
      {
        area: "モバイル",
        items: ["Swift（iOS）", "Kotlin（Android）", "Flutter", "Expo / React Native"],
        evidence: "KUE（4つの環境向けの SDK を開発・配布）",
      },
      {
        area: "AI / LLM",
        items: ["Claude", "Gemini", "MCP", "YAML / CEL"],
        evidence: "Creatures（生成 AI ゲーム基盤）、PrismDiff（MCP 連携）、Storiiva（LLM 連携）",
      },
      {
        area: "言語処理系",
        items: ["Rust", "WebAssembly", "型検査", "LSP"],
        evidence: "Restrict Language（コンパイラとエディタ支援）、ClinCloud（式インタープリター）",
      },
    ],
    caseStudies: [
      {
        title: "製薬向けマルチテナント EDC（臨床試験データ収集）基盤",
        organization: "ClinCloud",
        period: "2016 — 2023",
        role: "リードエンジニア / フルスタック",
        summary:
          "製薬企業の臨床試験業務を支える EDC を、立ち上げから本番運用まで開発しました。のちにリードエンジニアとして、設計・実装・運用を率いました。",
        highlights: [
          "テナントの分離とアクセス制御を含む、バックエンドとフロントエンドの機能を開発。",
          "誰が、いつ、どのデータを変えたかを残す監査証跡を実装し、規制下の業務に必要な追跡性を確保。",
          "設定駆動のフォーム、式インタープリター、Excel・CSV・PDF の入出力を実装。",
          "GCP から AWS への移行と Docker 化、JSF・jQuery から Aurelia・TypeScript へのフロントエンド刷新を担当。",
        ],
        stack: ["Kotlin", "Ktor", "Java", "TypeScript", "Aurelia", "AWS", "Docker"],
      },
      {
        title: "ポケモンカードゲーム開発チーム向けの社内データ基盤",
        organization: "Creatures",
        period: "2023 — 2026",
        role: "フルスタックエンジニア",
        summary: "カード、商品、イラストのデータを管理する社内基盤を、開発・保守しました。",
        highlights: [
          "ドメイン固有の複雑な業務ルール、管理用の設定画面、システム間のデータ同期を実装。",
          "アクセス制御と、スプレッドシートのように編集できるデータ編集機能を開発。",
          "Angular を Standalone Components、Typed Forms、JSpreadsheet で刷新し、本番に反映。",
        ],
        stack: ["Scala", "Play Framework", "Angular", "TypeScript", "MySQL", "GCP / GKE", "Terraform"],
      },
      {
        title: "生成 AI ゲーム基盤",
        organization: "Creatures",
        role: "テクニカルリード / エンジニア",
        summary:
          "約4名の職能横断チームで唯一のエンジニアとして開発を担い、技術面のリードとプロジェクト管理も兼ねました。",
        highlights: [
          "YAML と CEL（Common Expression Language）による、共通の宣言的なゲームランタイムを設計・実装。",
          "状態遷移、シナリオ分岐、キャラクターの振る舞い、LLM に渡すプロンプトと文脈を、設定で切り替えられるようにした。",
          "Anthropic Claude と Google Gemini を組み込み、小説執筆と音楽制作のアプリを約2か月で社内・限定公開向けに提供。",
        ],
        stack: ["Go", "Gin", "Next.js", "YAML", "CEL", "Claude", "Gemini"],
      },
      {
        title: "マルチチェーン対応ウォレットのバックエンド",
        organization: "HashPort",
        period: "2022",
        role: "バックエンドエンジニア",
        summary: "複数のブロックチェーンにまたがる、ウォレットのバックエンド API と送金処理を開発しました。",
        highlights: [
          "チェーンごとの仕様に合わせて、資産移転の連携処理を実装。",
          "情報が少ない領域で、調査と検証を重ねながら仕様を具体化。",
        ],
        stack: ["TypeScript", "Ethereum", "Tezos", "Bitcoin", "PLT"],
      },
    ],
    work: [
      {
        title: "Backend / API 改善",
        summary:
          "既存サービスの認証、入力検証、データ整合性、API の不具合を調査し、影響範囲を見極めたうえで修正します。",
        fit: "再現しにくい不具合、仕様と実装のズレ、段階的な改修",
        stack: "TypeScript / Kotlin / Java / Rails / GraphQL",
        scope: "調査、実装、テスト、影響確認",
        outcome: "修正コード、テスト、原因と判断の説明",
      },
      {
        title: "Data / Performance 調査",
        summary:
          "遅い画面や API を、クエリ、キャッシュ、アプリケーション処理、呼び出し構造まで追い、計測できる改善へつなげます。",
        fit: "GraphQL の N+1、SQL のボトルネック、バッチ処理、Redis の設計",
        stack: "MySQL / Redis / GraphQL / Scala / Rails",
        scope: "計測、原因の切り分け、改善案、実装",
        outcome: "調査記録、比較結果、改善コード",
      },
      {
        title: "既存システムの開発・立て直し",
        summary:
          "バックエンドを主軸に、フロントエンド、クラウド、CI まで含めて既存システムへ参加し、止めずに改善を積み重ねます。",
        fit: "技術負債の分割、移行、開発環境や CI の改善、運用の課題",
        stack: "React / Next.js / AWS / GCP / Terraform / Kubernetes",
        scope: "設計、実装、レビュー、運用改善",
        outcome: "段階的な変更、検証手順、引き継げる記録",
      },
    ],
    career: [
      {
        period: "2025.07 — 現在",
        startYear: 2025,
        endYear: 2026,
        company: "AppBrew",
        role: "Software Engineer",
        summary: "美容プラットフォームのバックエンドを中心に、Web と運用基盤も改善。",
        details: [
          "認証・入力検証・データ整合性に関する不具合の修正と、安全なリファクタリング。",
          "GraphQL の N+1 と、関連 API のパフォーマンスを改善。",
          "CI、ローカル開発環境、インシデント対応、必要に応じたモバイル UI の改善。",
        ],
        stack: "Ruby on Rails, GraphQL, React, Next.js, MySQL, Redis, AWS, GCP, Terraform",
      },
      {
        period: "2023.05 — 2026.03",
        startYear: 2023,
        endYear: 2026,
        company: "Creatures",
        role: "Full-stack Engineer / Tech Lead",
        summary: "ポケモンカードゲームの社内データ基盤と、生成 AI ゲーム基盤を開発。",
        details: [
          "カード・商品・イラストのデータを扱う社内基盤で、業務ルール、管理画面、システム間のデータ同期を実装。",
          "Angular を Standalone Components と Typed Forms で刷新し、本番に反映。",
          "生成 AI ゲーム基盤では唯一のエンジニアとして、YAML と CEL による宣言的なランタイムを設計。",
          "検索、認証、バッチ処理、データベース最適化、CI と E2E テストまで横断して担当。",
        ],
        stack: "Scala, Play Framework, Go, Gin, TypeScript, Angular, Next.js, MySQL, GCP / GKE, Terraform",
      },
      {
        period: "2022.11 — 2023.05",
        startYear: 2022,
        endYear: 2023,
        company: "ClinCloud",
        project: true,
        role: "Lead Engineer",
        summary: "初期開発から関わった EDC にリードエンジニアとして再参加し、3名のチームを率いた。",
        details: [
          "アーキテクチャ、実装、本番運用を主導。",
          "3名のチームで設計・実装・レビューを担い、既存機能の継続開発を推進。",
        ],
        stack: "Kotlin, Ktor, TypeScript, Aurelia, AWS, Docker",
      },
      {
        period: "2022.03 — 2022.10",
        startYear: 2022,
        endYear: 2022,
        company: "HashPort",
        role: "Backend Engineer",
        summary: "複数のチェーンに対応するウォレットの、バックエンド API と送金処理を開発。",
        details: [
          "Ethereum、Tezos、Bitcoin、PLT など、チェーンごとの連携処理を実装。",
          "情報が少ない領域で、調査と検証を重ねながら仕様を具体化。",
        ],
        stack: "TypeScript, Ethereum, Tezos, Bitcoin, PLT",
      },
      {
        period: "2016.04 — 2022.02",
        startYear: 2016,
        endYear: 2022,
        company: "System Denso Kogyo",
        role: "Full-stack Engineer",
        summary: "製薬向けのマルチテナント EDC「ClinCloud」を、立ち上げから本番運用まで開発。",
        details: [
          "設定駆動のフォーム、式インタープリター、Excel・CSV・PDF の入出力を実装。",
          "テナント単位のデータベース構成、GCP から AWS への移行、Docker 化を担当。",
          "JSF・jQuery から Aurelia・TypeScript へのフロントエンド刷新と、エンジニアの育成。",
        ],
        stack: "Java, Kotlin, Ktor, TypeScript, Aurelia, JSF, jQuery, GCP, AWS, Docker",
      },
    ],
  },
  en: {
    meta: {
      title: "Ischca — Software Engineer for Backend, Data, and Cloud",
      description:
        "Portfolio of Ischca, a software engineer. Products I build and run independently — KUE, Storiiva, PrismDiff, and Restrict Language — and the technologies I use at work.",
      profileTitle: "Products, Skills & Experience — Ischca",
      profileDescription:
        "Products I build and run independently (KUE, Storiiva, PrismDiff, Restrict Language), the technologies I use at work and on my own, and my selected work and career.",
    },
    navigation: {
      products: "Products",
      skills: "Skills",
      caseStudies: "Selected work",
      career: "Experience",
      work: "Services",
      contact: "Contact",
    },
    hero: {
      eyebrow: "Software Engineer · Tokyo",
      role: "Software Engineer — Backend / Full-stack",
      lead: "I design, build, and operate products, with a backend focus.",
      introduction:
        "Since 2016, I have designed, built, and operated enterprise systems and consumer products. I focus on APIs, data, and performance, and take on frontend, mobile, and cloud work when a product needs it.",
      craft: "TypeScript · Kotlin · Go · Scala · Ruby · Rust · AWS · GCP · Terraform",
      availability:
        "Open to ongoing part-time backend and platform contracts, with fully asynchronous, written collaboration through GitHub, Slack, and documentation.",
      experienceLabel: "Experience",
      experienceValue: "10+ years",
      locationLabel: "Based in",
      locationValue: "Tokyo",
      focusLabel: "Focus",
      focusValue: "Backend / Data / Cloud",
      communicationLabel: "Collaboration",
      communicationValue: "Async and written",
    },
    sections: {
      productsKicker: "Products",
      productsTitle: "Products",
      productsIntro: "Products I design, build, release, and operate on my own.",
      skillsKicker: "Skills",
      skillsTitle: "Skills",
      skillsIntro: "Technologies I use at work and in my own products, each with where I used it.",
      caseStudiesKicker: "Selected work",
      caseStudiesTitle: "Selected work",
      caseStudiesIntro: "Systems I have designed and built in my professional work.",
      careerKicker: "Experience",
      careerTitle: "Experience",
      careerIntro: "Roles and responsibilities, most recent first.",
      workKicker: "Services",
      workTitle: "Services",
      workIntro: "I mainly work on understanding and improving existing systems without disrupting delivery.",
      contactKicker: "Contact",
      contactTitle: "Contact",
      contactIntro: "For project inquiries, please write to me through LinkedIn or Upwork.",
      contactLetter:
        "I take on ongoing part-time contracts. For project inquiries, please write to me through LinkedIn or Upwork.",
    },
    labels: {
      fit: "Good fit for",
      stack: "Technologies",
      scope: "Scope",
      outcome: "Deliverables",
      role: "My role",
      evidence: "Used in",
      project: "Project",
      readInFull: "Read in full",
      viewGrimoire: "View the manuscript",
      language: "日本語",
      updated: "Last updated",
    },
    products: [
      {
        id: "kue",
        name: "KUE",
        kind: "Mobile SDK & SaaS",
        status: "SDK & CLI v0.6.0 · MIT",
        tagline:
          "Turns bugs and UI notes found while testing on real devices into GitHub Issues with a screenshot and a memo.",
        highlights: [
          "Works with Expo / React Native, native iOS and Android, and Flutter apps.",
          "Distributed through npm, Swift Package Manager, Maven Central, and pub.dev.",
          "Reports go to an app-defined handler or to KUE Cloud, which files GitHub Issues.",
        ],
        role: "I build the SDKs and the setup CLI, and provide them together with the hosted KUE Cloud.",
        stack: ["Swift", "Kotlin", "TypeScript", "Dart"],
        links: [
          { label: "Website", href: "https://kue.ischca.dev/en/" },
          { label: "Docs", href: "https://kue.ischca.dev/en/docs" },
          { label: "GitHub", href: "https://github.com/Ischca/kue" },
        ],
        emblem: "lens",
      },
      {
        id: "storiiva",
        name: "Storiiva",
        kind: "Web fiction platform",
        status: "Live",
        tagline: "A free platform for publishing and reading web fiction, including AI-assisted works.",
        highlights: [
          "Readers can read published episodes without creating an account.",
          "Supports multilingual publishing and discovery.",
          "Stories can be found through rankings, new arrivals, and genres.",
        ],
        role: "I plan, build, and operate it on my own.",
        stack: ["Next.js", "TypeScript", "Supabase", "LLM"],
        links: [{ label: "Website", href: "https://storiiva.com/en" }],
        emblem: "quill",
      },
      {
        id: "prismdiff",
        name: "PrismDiff",
        kind: "macOS app",
        status: "v1.0.6 · Signed & notarized",
        tagline:
          "A local-first desktop app for reviewing AI-written code and handing the findings back to the agent.",
        highlights: [
          "Over MCP, agent findings land on the exact lines of your local diff, and your replies flow back.",
          "Collapses whitespace churn and import moves so attention goes to meaningful changes.",
          "Reviews branches, worktrees, and GitHub pull requests locally.",
        ],
        role: "I design and build it, and ship the signed releases myself.",
        stack: ["Rust", "Tauri", "React", "MCP"],
        links: [{ label: "Website", href: "https://ischca.github.io/prismdiff/" }],
        emblem: "prism",
      },
      {
        id: "restrict",
        name: "Restrict Language",
        kind: "Programming language",
        status: "v0.0.1 · MIT",
        tagline: "A programming language for WebAssembly, where data comes before the operation.",
        highlights: [
          "OSV syntax puts arguments first and verbs last, so code reads in the direction data moves.",
          "Affine checks reject accidental reuse of moved values.",
          "Ships with a browser playground, an LSP server, and a VS Code extension.",
        ],
        role: "I develop the language specification, the compiler, and the editor tooling.",
        stack: ["Rust", "WebAssembly", "LSP"],
        links: [
          { label: "Website", href: "https://ischca.github.io/restrict_lang/" },
          { label: "GitHub", href: "https://github.com/Ischca/restrict_lang" },
        ],
        emblem: "branch",
      },
    ],
    skills: [
      {
        area: "Backend / APIs",
        items: ["Ruby on Rails", "Scala / Play Framework", "Kotlin / Ktor", "Go / Gin", "Node.js", "GraphQL"],
        evidence: "AppBrew (Rails, GraphQL), Creatures (Play, Gin), ClinCloud (Ktor), HashPort (TypeScript)",
      },
      {
        area: "Frontend",
        items: ["TypeScript", "React", "Next.js", "Angular", "Aurelia"],
        evidence: "Creatures (Angular modernization), Storiiva (Next.js), ClinCloud (JSF and jQuery to Aurelia)",
      },
      {
        area: "Data",
        items: ["MySQL", "Redis", "Supabase"],
        evidence: "AppBrew (GraphQL N+1 fixes), Creatures (database optimization, batch jobs), Storiiva (Supabase)",
      },
      {
        area: "Cloud & infrastructure",
        items: ["AWS", "GCP / GKE", "Kubernetes", "Docker", "Terraform"],
        evidence: "ClinCloud (GCP-to-AWS migration, Docker), Creatures (GKE, Terraform), AppBrew (AWS, GCP)",
      },
      {
        area: "Mobile",
        items: ["Swift (iOS)", "Kotlin (Android)", "Flutter", "Expo / React Native"],
        evidence: "KUE (SDKs built and distributed for four platforms)",
      },
      {
        area: "AI & LLMs",
        items: ["Claude", "Gemini", "MCP", "YAML / CEL"],
        evidence: "Creatures (generative AI game platform), PrismDiff (MCP integration), Storiiva (LLM features)",
      },
      {
        area: "Language tooling",
        items: ["Rust", "WebAssembly", "Type checking", "LSP"],
        evidence: "Restrict Language (compiler and editor tooling), ClinCloud (expression interpreter)",
      },
    ],
    caseStudies: [
      {
        title: "Multi-tenant clinical EDC platform for pharmaceutical customers",
        organization: "ClinCloud",
        period: "2016 — 2023",
        role: "Lead Engineer / Full-stack",
        summary:
          "Built an electronic data capture platform for clinical trials from greenfield development through production, and later led its architecture, implementation, and operations.",
        highlights: [
          "Developed backend and frontend features, including tenant isolation and access control.",
          "Implemented audit trails that record who changed which data and when, for traceability in regulated workflows.",
          "Built configuration-driven forms, an expression interpreter, and Excel, CSV, and PDF workflows.",
          "Migrated from GCP to AWS with Docker, and modernized the frontend from JSF and jQuery to Aurelia and TypeScript.",
        ],
        stack: ["Kotlin", "Ktor", "Java", "TypeScript", "Aurelia", "AWS", "Docker"],
      },
      {
        title: "Internal data platform for the Pokémon Trading Card Game team",
        organization: "Creatures",
        period: "2023 — 2026",
        role: "Full-stack Engineer",
        summary: "Developed and maintained the internal platform that manages card, product, and illustration data.",
        highlights: [
          "Implemented complex domain rules, administrative configuration screens, and cross-system data synchronization.",
          "Built access control and spreadsheet-style data editing.",
          "Modernized the Angular frontend with Standalone Components, Typed Forms, and JSpreadsheet, and shipped it to production.",
        ],
        stack: ["Scala", "Play Framework", "Angular", "TypeScript", "MySQL", "GCP / GKE", "Terraform"],
      },
      {
        title: "Generative AI game platform",
        organization: "Creatures",
        role: "Technical Lead / Engineer",
        summary:
          "Served as the only engineer on a cross-functional team of about four, while also handling technical leadership and project management.",
        highlights: [
          "Designed and built a shared, declarative game runtime with YAML and the Common Expression Language (CEL).",
          "Made state transitions, scenario branching, character behavior, and LLM prompt and context selection configurable.",
          "Integrated Anthropic Claude and Google Gemini, and delivered novel-writing and music-making apps for internal and limited release in about two months.",
        ],
        stack: ["Go", "Gin", "Next.js", "YAML", "CEL", "Claude", "Gemini"],
      },
      {
        title: "Multi-chain wallet backend",
        organization: "HashPort",
        period: "2022",
        role: "Backend Engineer",
        summary: "Developed wallet backend APIs and transaction workflows across multiple blockchain networks.",
        highlights: [
          "Implemented chain-specific integrations for asset transfers.",
          "Turned sparse documentation into working specifications through research and verification.",
        ],
        stack: ["TypeScript", "Ethereum", "Tezos", "Bitcoin", "PLT"],
      },
    ],
    work: [
      {
        title: "Backend / API improvements",
        summary:
          "I investigate and fix authentication, validation, data integrity, and API defects in existing services while accounting for the surrounding impact.",
        fit: "Hard-to-reproduce defects, spec-to-code gaps, staged changes",
        stack: "TypeScript / Kotlin / Java / Rails / GraphQL",
        scope: "Investigation, implementation, tests, impact review",
        outcome: "Code changes, tests, and an explanation of cause and decisions",
      },
      {
        title: "Data / performance investigation",
        summary:
          "I trace slow screens and APIs through queries, caches, application logic, and call structure, then turn the findings into measurable improvements.",
        fit: "GraphQL N+1 issues, SQL bottlenecks, batch jobs, Redis design",
        stack: "MySQL / Redis / GraphQL / Scala / Rails",
        scope: "Measurement, isolation, options, implementation",
        outcome: "Investigation notes, before/after evidence, and code changes",
      },
      {
        title: "Existing-system development",
        summary:
          "I join existing systems with a backend focus and improve them without stopping delivery, including frontend, cloud, and CI when necessary.",
        fit: "Splitting technical debt, migrations, CI and local tooling, operations",
        stack: "React / Next.js / AWS / GCP / Terraform / Kubernetes",
        scope: "Design, implementation, review, operational improvements",
        outcome: "Incremental changes, verification steps, maintainable notes",
      },
    ],
    career: [
      {
        period: "2025.07 — NOW",
        startYear: 2025,
        endYear: 2026,
        company: "AppBrew",
        role: "Software Engineer",
        summary: "Backend-centered work on a beauty platform, with web and operational improvements.",
        details: [
          "Fixed authentication, validation, and data-integrity defects with safe, staged refactoring.",
          "Improved GraphQL N+1 behavior and the performance of related APIs.",
          "Worked on CI, local development, incident response, and selected mobile UI improvements.",
        ],
        stack: "Ruby on Rails, GraphQL, React, Next.js, MySQL, Redis, AWS, GCP, Terraform",
      },
      {
        period: "2023.05 — 2026.03",
        startYear: 2023,
        endYear: 2026,
        company: "Creatures",
        role: "Full-stack Engineer / Tech Lead",
        summary: "Built the Pokémon TCG team's internal data platform and a generative AI game platform.",
        details: [
          "Implemented domain rules, admin screens, and cross-system sync on the platform for card, product, and illustration data.",
          "Modernized the Angular frontend with Standalone Components and Typed Forms, and shipped it to production.",
          "As the only engineer on the generative AI platform, designed a declarative runtime with YAML and CEL.",
          "Worked across search, authentication, batch processing, database optimization, CI, and end-to-end tests.",
        ],
        stack: "Scala, Play Framework, Go, Gin, TypeScript, Angular, Next.js, MySQL, GCP / GKE, Terraform",
      },
      {
        period: "2022.11 — 2023.05",
        startYear: 2022,
        endYear: 2023,
        company: "ClinCloud",
        project: true,
        role: "Lead Engineer",
        summary: "Returned to the EDC platform I had helped build from the start, and led a three-engineer team.",
        details: [
          "Led the architecture, implementation, and production operations.",
          "Handled design, implementation, and review while moving ongoing product work forward.",
        ],
        stack: "Kotlin, Ktor, TypeScript, Aurelia, AWS, Docker",
      },
      {
        period: "2022.03 — 2022.10",
        startYear: 2022,
        endYear: 2022,
        company: "HashPort",
        role: "Backend Engineer",
        summary: "Built wallet backend APIs and transaction workflows across multiple blockchains.",
        details: [
          "Implemented chain-specific integrations for Ethereum, Tezos, Bitcoin, PLT, and more.",
          "Turned sparse documentation into working specifications through research and verification.",
        ],
        stack: "TypeScript, Ethereum, Tezos, Bitcoin, PLT",
      },
      {
        period: "2016.04 — 2022.02",
        startYear: 2016,
        endYear: 2022,
        company: "System Denso Kogyo",
        role: "Full-stack Engineer",
        summary: "Built ClinCloud, a multi-tenant pharmaceutical EDC, from greenfield development through production.",
        details: [
          "Implemented configuration-driven forms, an expression interpreter, and Excel, CSV, and PDF workflows.",
          "Worked on per-tenant databases, a GCP-to-AWS migration, and Docker-based environments.",
          "Modernized the frontend from JSF and jQuery to Aurelia and TypeScript, and trained another engineer.",
        ],
        stack: "Java, Kotlin, Ktor, TypeScript, Aurelia, JSF, jQuery, GCP, AWS, Docker",
      },
    ],
  },
};
