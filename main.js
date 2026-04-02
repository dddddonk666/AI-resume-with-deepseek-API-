import { latexTemplate } from "./latexTemplate.js";

const $ = (id) => document.getElementById(id);
const val = (id) => ($(id)?.value ?? "").trim();
const setVal = (id, value) => {
  const el = $(id);
  if (el) el.value = value ?? "";
};
const esc = (text) => String(text ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;");

const AI_CONFIG_STORAGE_KEY = "resume-gen.deepseek-config";
const DEFAULT_AI_CONFIG = {
  apiKey: "sk-8c72d1d294254b3db4270e6b036b25a5",
  baseUrl: "https://api.deepseek.com",
  model: "deepseek-chat",
};

function setStatus(elId, msg, cls = "") {
  const el = $(elId);
  if (!el) return;
  el.className = `status-msg ${cls}`.trim();
  el.innerHTML = cls === "loading"
    ? `<span class="spin"></span>${esc(msg)}`
    : esc(msg);
}

function fillTemplate(tpl, data) {
  return tpl.replace(/\$\{(.*?)\}/g, (_, key) => data[key] ?? "");
}

function loadAIConfig() {
  try {
    const saved = JSON.parse(localStorage.getItem(AI_CONFIG_STORAGE_KEY) || "{}");
    return { ...DEFAULT_AI_CONFIG, ...saved };
  } catch {
    return { ...DEFAULT_AI_CONFIG };
  }
}

function saveAIConfig(config) {
  localStorage.setItem(AI_CONFIG_STORAGE_KEY, JSON.stringify(config));
}

function readOptionalInput(id, fallback = "") {
  const el = $(id);
  if (!el) return fallback;
  return (el.value ?? "").trim() || fallback;
}

function getAIConfig() {
  const saved = loadAIConfig();
  const config = {
    apiKey: readOptionalInput("api-key", saved.apiKey || DEFAULT_AI_CONFIG.apiKey),
    baseUrl: readOptionalInput("api-base-url", saved.baseUrl || DEFAULT_AI_CONFIG.baseUrl),
    model: readOptionalInput("api-model", saved.model || DEFAULT_AI_CONFIG.model),
  };
  saveAIConfig(config);
  return config;
}

function initAIConfig() {
  const config = loadAIConfig();
  setVal("api-key", config.apiKey);
  setVal("api-base-url", config.baseUrl);
  setVal("api-model", config.model);

  const apiKeyInput = $("api-key");
  const configGrid = apiKeyInput?.closest(".grid3");
  const configTip = configGrid?.nextElementSibling;
  if (configGrid) configGrid.remove();
  if (configTip?.classList?.contains("tip")) configTip.remove();
}

function getChatCompletionsUrl(baseUrl) {
  const normalized = (baseUrl || DEFAULT_AI_CONFIG.baseUrl).replace(/\/+$/, "");
  if (normalized.endsWith("/chat/completions")) return normalized;
  return `${normalized}/chat/completions`;
}

function extractJSON(text) {
  const cleaned = String(text ?? "").replace(/```json|```/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("AI response was not valid JSON");
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}

function collect() {
  return {
    name: val("name") || "Name",
    phone: val("phone") || "Phone",
    email: val("email") || "Email",
    school: val("school") || "School",
    major: val("major") || "Major",
    time: val("edu-time") || "2021 - 2025",
    summary: val("summary") || "",
    project1_title: val("project1_title") || "",
    project1_time: val("proj1-time") || "",
    project1_desc: val("project1_desc") || "",
    project2_title: val("project2_title") || "",
    project2_time: val("proj2-time") || "",
    project2_desc: val("project2_desc") || "",
    skill1: val("skill1") || "",
    skill2: val("skill2") || "",
    skill3: val("skill3") || "",
  };
}

async function callAI(raw) {
  const config = getAIConfig();
  if (!config.apiKey) {
    throw new Error("Please enter your DeepSeek API Key first");
  }

  const prompt = `
Rewrite the user's rough resume notes into concise, professional Chinese resume language.
Return JSON only with this exact shape:
{
  "summary": "Chinese professional summary, <= 70 chars",
  "project1_title": "Chinese title, <= 8 chars",
  "project1_desc": "Chinese description, <= 60 chars",
  "project2_title": "Chinese title, <= 8 chars",
  "project2_desc": "Chinese description, <= 60 chars",
  "skill1": "Chinese skill, <= 20 chars",
  "skill2": "Chinese skill, <= 20 chars",
  "skill3": "Chinese skill, <= 20 chars"
}

User notes:
Summary: ${raw.summary}
Project 1 (${raw.p1time}): ${raw.p1}
Project 2 (${raw.p2time}): ${raw.p2}
Skills: ${raw.skills}
  `.trim();

  const res = await fetch(getChatCompletionsUrl(config.baseUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.7,
      max_tokens: 1000,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are a resume optimization assistant. Output valid JSON only.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || `API error ${res.status}`);
  }

  return extractJSON(data?.choices?.[0]?.message?.content);
}

window.aiSummarize = async function () {
  const raw = {
    summary: val("raw-summary"),
    p1: val("raw-proj1"),
    p1time: val("proj1-time"),
    p2: val("raw-proj2"),
    p2time: val("proj2-time"),
    skills: val("raw-skills"),
  };

  if (!Object.values(raw).some(Boolean)) {
    setStatus("ai-status", "Please enter at least one note before using AI", "err");
    return;
  }

  const btn = $("btn-ai");
  btn.disabled = true;
  setStatus("ai-status", "DeepSeek is polishing your resume...", "loading");

  try {
    const result = await callAI(raw);
    setVal("summary", result.summary);
    setVal("project1_title", result.project1_title);
    setVal("project1_desc", result.project1_desc);
    setVal("project2_title", result.project2_title);
    setVal("project2_desc", result.project2_desc);
    setVal("skill1", result.skill1);
    setVal("skill2", result.skill2);
    setVal("skill3", result.skill3);

    const p3 = $("p3");
    const rail = $("rail3");
    p3.style.display = "block";
    if (rail) rail.style.display = "block";
    setTimeout(() => p3.scrollIntoView({ behavior: "smooth", block: "start" }), 80);

    setStatus("ai-status", "AI summary complete. You can edit the result below.", "ok");
  } catch (error) {
    console.error(error);
    setStatus("ai-status", `Error: ${error.message}`, "err");
  } finally {
    btn.disabled = false;
  }
};

function buildResume(data) {
  const skills = [data.skill1, data.skill2, data.skill3].filter(Boolean);

  return `
<div class="r-name">${esc(data.name)}</div>
<div class="r-contact">
  <span>Tel ${esc(data.phone)}</span>
  <span>Email ${esc(data.email)}</span>
</div>

<div class="r-sec">Profile</div>
<div class="r-body">${esc(data.summary)}</div>

<div class="r-sec">Education</div>
<div class="r-row">
  <span class="r-bold">${esc(data.school)}</span>
  <span class="r-date">${esc(data.time)}</span>
</div>
<div class="r-body" style="margin-top:2px">Major: ${esc(data.major)}</div>

<div class="r-sec">Projects</div>
<div class="r-row">
  <span class="r-bold">${esc(data.project1_title)}</span>
  <span class="r-date">${esc(data.project1_time)}</span>
</div>
<div class="r-body r-proj-gap">${esc(data.project1_desc)}</div>
<div class="r-row">
  <span class="r-bold">${esc(data.project2_title)}</span>
  <span class="r-date">${esc(data.project2_time)}</span>
</div>
<div class="r-body r-proj-gap">${esc(data.project2_desc)}</div>

<div class="r-sec">Skills</div>
<ul class="r-ul">
  ${skills.map((skill) => `<li>${esc(skill)}</li>`).join("")}
</ul>
  `.trim();
}

window.renderPreview = function () {
  const data = collect();
  $("resume-render").innerHTML = buildResume(data);
  const wrap = $("resume-wrap");
  wrap.style.display = "block";
  setTimeout(() => wrap.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
};

window.exportPDF = async function () {
  const data = collect();
  $("resume-render").innerHTML = buildResume(data);
  $("resume-wrap").style.display = "block";

  const btn = $("btn-pdf");
  btn.disabled = true;
  setStatus("pdf-status", "Rendering PDF, please wait...", "loading");

  await document.fonts.ready;
  await new Promise((resolve) => setTimeout(resolve, 200));

  try {
    const el = $("resume-render");
    const canvas = await html2canvas(el, {
      scale: 2.5,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
    });

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

    const pageWidth = 210;
    const pageHeight = 297;
    const imageWidth = pageWidth;
    const imageHeight = (canvas.height / canvas.width) * imageWidth;

    let remainingHeight = imageHeight;
    let sourceY = 0;
    let page = 0;

    while (remainingHeight > 0.5) {
      if (page > 0) pdf.addPage();

      const sliceHeight = Math.min(pageHeight, remainingHeight);
      const sourceHeight = (sliceHeight / imageHeight) * canvas.height;

      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = Math.ceil(sourceHeight);
      sliceCanvas.getContext("2d").drawImage(
        canvas,
        0,
        sourceY,
        canvas.width,
        sourceHeight,
        0,
        0,
        canvas.width,
        Math.ceil(sourceHeight)
      );

      pdf.addImage(sliceCanvas.toDataURL("image/jpeg", 0.96), "JPEG", 0, 0, pageWidth, sliceHeight);
      sourceY += sourceHeight;
      remainingHeight -= sliceHeight;
      page += 1;
    }

    pdf.save(`${data.name || "resume"}_resume.pdf`);
    setStatus("pdf-status", "PDF exported successfully", "ok");
  } catch (error) {
    console.error(error);
    setStatus("pdf-status", `Export failed: ${error.message}`, "err");
  } finally {
    btn.disabled = false;
  }
};

let latexOpen = false;
window.toggleLatex = function () {
  const wrap = $("latex-wrap");
  latexOpen = !latexOpen;
  if (latexOpen) {
    $("latex-out").textContent = fillTemplate(latexTemplate, collect());
    wrap.style.display = "block";
    setTimeout(() => wrap.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  } else {
    wrap.style.display = "none";
  }
};

window.copyLatex = function () {
  navigator.clipboard.writeText($("latex-out").textContent).then(() => {
    const button = document.querySelector(".btn-copy");
    const original = button.textContent;
    button.textContent = "Copied";
    setTimeout(() => {
      button.textContent = original;
    }, 1800);
  });
};

initAIConfig();
