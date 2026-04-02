export const latexTemplate = `
\\documentclass[11pt]{article}
\\usepackage[a4paper, margin=0.85in]{geometry}
\\usepackage{titlesec}
\\usepackage{enumitem}
\\usepackage{hyperref}
\\usepackage{xeCJK}
\\setCJKmainfont{Noto Serif CJK SC}

\\hypersetup{colorlinks=true,urlcolor=black,linkcolor=black}
\\titleformat{\\section}{\\normalsize\\bfseries\\uppercase}{}{0em}{}[\\titlerule]
\\setlength{\\parskip}{3pt}
\\pagestyle{empty}

\\begin{document}

% ══ 个人信息 ══
\\begin{center}
  {\\Large \\textbf{\${name}}} \\\\[5pt]
  {\\small 电话：\${phone} \\enspace|\\enspace 邮箱：\\href{mailto:\${email}}{\${email}}}
\\end{center}

\\vspace{6pt}

% ══ 个人简介 ══
\\section*{个人简介}
\${summary}

% ══ 教育背景 ══
\\section*{教育背景}
\\textbf{\${school}} \\hfill \${time} \\\\
专业：\${major}

% ══ 项目经历 ══
\\section*{项目经历}
\\begin{itemize}[leftmargin=*, itemsep=6pt, topsep=2pt]
  \\item
    \\textbf{\${project1_title}} \\hfill \\textit{\${project1_time}} \\\\
    \${project1_desc}
  \\item
    \\textbf{\${project2_title}} \\hfill \\textit{\${project2_time}} \\\\
    \${project2_desc}
\\end{itemize}

% ══ 技能 ══
\\section*{技能}
\\begin{itemize}[leftmargin=*, itemsep=2pt, topsep=2pt]
  \\item \${skill1}
  \\item \${skill2}
  \\item \${skill3}
\\end{itemize}

\\end{document}
`;
