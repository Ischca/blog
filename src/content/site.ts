export type Locale = "ja" | "en";

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
  role: string;
  summary: string;
  details: string[];
  stack: string;
};

export type ProductItem = {
  name: string;
  kind: string;
  description: string;
  purpose: string;
  stack: string;
  website: string;
  github: string;
};

export type SiteContent = {
  navigation: {
    work: string;
    career: string;
    products: string;
    contact: string;
  };
  hero: {
    eyebrow: string;
    line1: string;
    line2: string;
    introduction: string;
    experienceLabel: string;
    experienceValue: string;
    focusLabel: string;
    focusValue: string;
    communicationLabel: string;
    communicationValue: string;
  };
  sections: {
    workKicker: string;
    workTitle: string;
    workIntro: string;
    careerKicker: string;
    careerTitle: string;
    careerIntro: string;
    productsKicker: string;
    productsTitle: string;
    productsIntro: string;
    contactKicker: string;
    contactTitle: string;
  };
  labels: {
    fit: string;
    stack: string;
    scope: string;
    outcome: string;
    product: string;
    website: string;
    details: string;
    close: string;
  };
  work: WorkItem[];
  career: CareerItem[];
  products: ProductItem[];
};

const sharedProducts = {
  restrict: {
    name: "Restrict Language",
    website: "https://ischca.github.io/restrict_lang/",
    github: "https://github.com/Ischca/restrict_lang",
  },
  prism: {
    name: "PrismDiff",
    website: "https://ischca.github.io/prismdiff/",
    github: "https://github.com/Ischca/prismdiff",
  },
};

export const siteContent: Record<Locale, SiteContent> = {
  ja: {
    navigation: {
      work: "ご依頼について",
      career: "経歴",
      products: "つくったもの",
      contact: "連絡先",
    },
    hero: {
      eyebrow: "Software Engineer · Japan",
      line1: "バックエンドを軸に、",
      line2: "プロダクトを作り、育てる。",
      introduction:
        "2016年から、業務システムとコンシューマープロダクトの設計・実装・運用に携わっています。API、データ、パフォーマンスの問題を中心に、必要ならフロントエンドやクラウドまで横断します。",
      experienceLabel: "実務経験",
      experienceValue: "10年以上",
      focusLabel: "主軸",
      focusValue: "Backend / Data / Cloud",
      communicationLabel: "コミュニケーション",
      communicationValue: "非同期・テキスト中心",
    },
    sections: {
      workKicker: "Work with me",
      workTitle: "ご依頼について",
      workIntro:
        "現在の経験を、そのまま仕事の種類に分けました。既存プロダクトの限定された改善から、継続的な開発参加まで対応できます。",
      careerKicker: "Career",
      careerTitle: "経歴",
      careerIntro:
        "期間、役割、担当したこと、技術を職歴ごとに記載しています。各項目を開くと詳細を確認できます。",
      productsKicker: "Products",
      productsTitle: "つくったもの",
      productsIntro:
        "個人で設計・開発しているプロダクトです。紹介ページとソースコードから、現在の実装を確認できます。",
      contactKicker: "Contact",
      contactTitle: "条件が合いそうなら、テキストで声をかけてください。",
    },
    labels: {
      fit: "向いている案件",
      stack: "主な技術",
      scope: "対応範囲",
      outcome: "成果物",
      product: "プロダクト",
      website: "紹介ページ",
      details: "詳細を見る",
      close: "閉じる",
    },
    work: [
      {
        title: "Backend / API 改善",
        summary:
          "既存サービスの認証、入力検証、データ整合性、API不具合を調査し、影響範囲を見極めたうえで修正します。",
        fit: "再現しにくい不具合、仕様と実装のズレ、段階的な改修",
        stack: "TypeScript / Kotlin / Java / Rails / GraphQL",
        scope: "調査、実装、テスト、影響確認",
        outcome: "修正コード、テスト、原因と判断の説明",
      },
      {
        title: "Data / Performance 調査",
        summary:
          "遅い画面やAPIを、クエリ、キャッシュ、アプリケーション処理、呼び出し構造まで追い、計測可能な改善へつなげます。",
        fit: "GraphQLのN+1、SQLボトルネック、バッチ処理、Redis設計",
        stack: "MySQL / Redis / GraphQL / Scala / Rails",
        scope: "計測、原因分離、改善案、実装",
        outcome: "調査記録、比較結果、改善コード",
      },
      {
        title: "既存システムの開発・立て直し",
        summary:
          "バックエンドを主軸に、フロントエンド、クラウド、CIまで含む既存システムへ参加し、止めずに改善を積み重ねます。",
        fit: "技術負債の分割、移行、開発環境やCIの改善、運用課題",
        stack: "React / Next.js / AWS / GCP / Terraform / Kubernetes",
        scope: "設計、実装、レビュー、運用改善",
        outcome: "段階的な変更、検証手順、引き継ぎ可能な記録",
      },
    ],
    career: [
      {
        period: "2025.07 — NOW",
        startYear: 2025,
        endYear: 2026,
        company: "AppBrew",
        role: "Software Engineer",
        summary: "美容プラットフォームのバックエンドを中心に、Webと運用基盤も改善。",
        details: [
          "認証・入力検証・データ整合性に関する不具合修正と安全なリファクタリング。",
          "GraphQLのN+1や関連APIのパフォーマンス改善。",
          "CI、ローカル開発環境、インシデント対応、必要に応じたモバイルUIの改善。",
        ],
        stack: "Ruby on Rails, GraphQL, React, Next.js, MySQL, Redis, AWS, GCP, Terraform",
      },
      {
        period: "2023.05 — 2026.03",
        startYear: 2023,
        endYear: 2026,
        company: "Creatures",
        role: "Software Engineer",
        summary: "ポケモンカードゲーム関連のデータ集約型システムを開発。",
        details: [
          "検索、認証、バッチ処理、データベース最適化、監視まで横断して担当。",
          "CIとE2Eテストを含む、継続的に変更できる開発基盤を整備。",
          "Pokémon TCGおよびPokémon TCG Pocketを支えるシステムに参加。",
        ],
        stack: "Scala, Play Framework, TypeScript, Angular, MySQL, GCP, Terraform, Kubernetes",
      },
      {
        period: "2022.11 — 2023.05",
        startYear: 2022,
        endYear: 2023,
        company: "ClinkCloud",
        role: "Lead Engineer",
        summary: "EDCプロダクトへ再参加し、3名の開発チームをリード。",
        details: [
          "初期開発から関わったEDCプロダクトへリードエンジニアとして再参加。",
          "3名チームで設計・実装・レビューを担い、既存機能の継続開発を推進。",
        ],
        stack: "Kotlin, Ktor, TypeScript, Aurelia, AWS, Docker",
      },
      {
        period: "2022.03 — 2022.10",
        startYear: 2022,
        endYear: 2022,
        company: "Freelance",
        role: "Blockchain Engineer",
        summary: "仕様が限定的な環境で、複数チェーン対応ウォレットを開発。",
        details: [
          "Ethereum、IOST、Polkadot、Tezosに対応するウォレット機能を実装。",
          "情報が少ない領域で、調査と検証を重ねながら仕様を具体化。",
        ],
        stack: "Ethereum, IOST, Polkadot, Tezos, Wallet Development",
      },
      {
        period: "2016.04 — 2022.02",
        startYear: 2016,
        endYear: 2022,
        company: "System Denso Kogyo",
        role: "Full-stack Engineer",
        summary: "製薬向けマルチテナントEDCを、立ち上げから本番運用まで開発。",
        details: [
          "設定駆動フォーム、式インタープリター、Excel・CSV・PDF入出力を実装。",
          "テナント単位のデータベース構成、GCPからAWSへの移行、Docker化を担当。",
          "JSF・jQueryからAurelia・TypeScriptへのフロントエンド刷新と、エンジニア育成。",
        ],
        stack: "Java, Kotlin, Ktor, TypeScript, Aurelia, JSF, jQuery, GCP, AWS, Docker",
      },
    ],
    products: [
      {
        ...sharedProducts.restrict,
        kind: "Programming Language",
        description:
          "WebAssemblyへコンパイルする関数型プログラミング言語。言語仕様、コンパイラ、実行境界、LSP、VS Code拡張まで一貫して開発しています。",
        purpose: "言語設計からエディタ体験までを試せる実装",
        stack: "Rust / WebAssembly / LSP",
      },
      {
        ...sharedProducts.prism,
        kind: "Desktop App",
        description:
          "差分のノイズを抑え、意味のある変更へ集中するためのローカルファーストなGit diffアプリ。",
        purpose: "差分の確認と判断をしやすくするデスクトップUI",
        stack: "Rust / Tauri / React",
      },
    ],
  },
  en: {
    navigation: {
      work: "Work with me",
      career: "Career",
      products: "Products",
      contact: "Contact",
    },
    hero: {
      eyebrow: "Software Engineer · Japan",
      line1: "Building and evolving products,",
      line2: "with a backend focus.",
      introduction:
        "Since 2016, I have designed, built, and operated enterprise systems and consumer products. I focus on APIs, data, and performance, and cross into frontend and cloud infrastructure when the work calls for it.",
      experienceLabel: "Professional experience",
      experienceValue: "10+ years",
      focusLabel: "Focus",
      focusValue: "Backend / Data / Cloud",
      communicationLabel: "Communication",
      communicationValue: "Async and written",
    },
    sections: {
      workKicker: "Work with me",
      workTitle: "Ways to work together",
      workIntro:
        "Concrete types of engagements based on work I have already done, from scoped improvements to ongoing participation in a development team.",
      careerKicker: "Career",
      careerTitle: "Career",
      careerIntro:
        "Each role shows its period, responsibilities, scope, and technologies. Open an entry to see the detail.",
      productsKicker: "Products",
      productsTitle: "Products",
      productsIntro:
        "Products I design and build independently, with links to their introductions and source code.",
      contactKicker: "Contact",
      contactTitle: "If the fit looks right, send me a written message.",
    },
    labels: {
      fit: "Good fit for",
      stack: "Core stack",
      scope: "Scope",
      outcome: "Deliverables",
      product: "Product",
      website: "Website",
      details: "View details",
      close: "Close",
    },
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
          "Fixed authentication, validation, and data-integrity defects with safe staged refactoring.",
          "Improved GraphQL N+1 behavior and performance in related APIs.",
          "Worked on CI, local development, incident response, and selected mobile UI improvements.",
        ],
        stack: "Ruby on Rails, GraphQL, React, Next.js, MySQL, Redis, AWS, GCP, Terraform",
      },
      {
        period: "2023.05 — 2026.03",
        startYear: 2023,
        endYear: 2026,
        company: "Creatures",
        role: "Software Engineer",
        summary: "Built data-intensive systems related to the Pokémon Trading Card Game.",
        details: [
          "Worked across search, authentication, batch processing, database optimization, and monitoring.",
          "Improved the delivery foundation, including CI and end-to-end tests.",
          "Contributed to systems supporting Pokémon TCG and Pokémon TCG Pocket.",
        ],
        stack: "Scala, Play Framework, TypeScript, Angular, MySQL, GCP, Terraform, Kubernetes",
      },
      {
        period: "2022.11 — 2023.05",
        startYear: 2022,
        endYear: 2023,
        company: "ClinkCloud",
        role: "Lead Engineer",
        summary: "Returned to an EDC product and led a three-engineer team.",
        details: [
          "Rejoined the EDC product I had helped build from its initial development, now as lead engineer.",
          "Handled design, implementation, and review while moving ongoing product work forward.",
        ],
        stack: "Kotlin, Ktor, TypeScript, Aurelia, AWS, Docker",
      },
      {
        period: "2022.03 — 2022.10",
        startYear: 2022,
        endYear: 2022,
        company: "Freelance",
        role: "Blockchain Engineer",
        summary: "Built a multi-chain wallet in an environment with sparse specifications.",
        details: [
          "Implemented wallet features for Ethereum, IOST, Polkadot, and Tezos.",
          "Turned limited information into working specifications through research and verification.",
        ],
        stack: "Ethereum, IOST, Polkadot, Tezos, Wallet Development",
      },
      {
        period: "2016.04 — 2022.02",
        startYear: 2016,
        endYear: 2022,
        company: "System Denso Kogyo",
        role: "Full-stack Engineer",
        summary: "Built a multi-tenant pharmaceutical EDC from greenfield development through production.",
        details: [
          "Implemented configuration-driven forms, an expression interpreter, and Excel, CSV, and PDF workflows.",
          "Worked on per-tenant databases, a GCP-to-AWS migration, and Docker-based environments.",
          "Modernized the frontend from JSF and jQuery to Aurelia and TypeScript, and trained another engineer.",
        ],
        stack: "Java, Kotlin, Ktor, TypeScript, Aurelia, JSF, jQuery, GCP, AWS, Docker",
      },
    ],
    products: [
      {
        ...sharedProducts.restrict,
        kind: "Programming Language",
        description:
          "A functional programming language that compiles to WebAssembly, spanning the language specification, compiler, execution boundary, LSP, and VS Code extension.",
        purpose: "An end-to-end implementation spanning language design and editor experience",
        stack: "Rust / WebAssembly / LSP",
      },
      {
        ...sharedProducts.prism,
        kind: "Desktop App",
        description:
          "A local-first Git diff application that suppresses noise so reviewers can focus on meaningful changes.",
        purpose: "A desktop UI that supports clearer diff review and decisions",
        stack: "Rust / Tauri / React",
      },
    ],
  },
};
