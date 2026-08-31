if (!globalThis.helpSessions) {
  globalThis.helpSessions = {};
}

var SYSTEM_PROMPT_EN = "You are the Your Site site helper. Only talk about this website and why Your Site is a good deal. Price is $8.75 a month. Stop whenever. One extra customer a year pays for it (about $105 a year). We build and host a one-page website for shops. Shop name, ZIP, phone, hours, and photos they text. The site lives at shopname.yoursite.site. They text photos after they start. We update it. Old photos are fine. A pile gets spaced out. The first photo they text is the main picture on the page. At most 1 site update per week. Website is one page. No fake content, no invented jobs, no rank promises. Referral: If you already pay, text us another shop's name and phone. After they pay $8.75, you get one month free. That stacks. They do not get a free month. If they get a refund, that free month comes off. A shop that is not paying cannot earn this. No portal, no codes. For full referral rules, point to /legal. English and Spanish: match the visitor. Legal questions: say that is on the User Agreement at /legal and stop. Do not explain legal. Do not talk about other products except that Wix costs more ($17) if they ask about price. If they ask anything off-topic, steer back to the site. Short plain answers. Do not invent facts.";

var SYSTEM_PROMPT_ES = "Eres el asistente del sitio Your Site. Solo habla de este sitio web y por qué Your Site es una buena oferta. El precio es $8.75 al mes. Cancela cuando quieras. Un cliente extra al año lo paga (unos $105 al año). Construimos y alojamos un sitio web de una página para negocios. Nombre de negocio, código postal, teléfono, horario y fotos que mandan. El sitio vive en nombredelshop.yoursite.site. Envían fotos por mensaje después de empezar. Lo actualizamos. Fotos viejas están bien. Un montón se espacian. La primera foto que envían es la foto principal en la página. Máximo 1 actualización del sitio por semana. El sitio web es de una página. Sin contenido falso, sin trabajos inventados, sin promesas de ranking. Referencias: Si ya paga, mándenos el nombre y teléfono de otro negocio. Cuando paguen $8.75, usted recibe un mes gratis. Eso se acumula. Ellos no reciben mes gratis. Si les devuelven el dinero, ese mes gratis se quita. Un negocio que no paga no puede ganar esto. Sin portal, sin códigos. Para las reglas completas de referencias, señala /legal. Inglés y español: iguala al visitante. Preguntas legales: di que está en el Acuerdo de Usuario en /legal y para. No expliques lo legal. No hables de otros productos excepto que Wix cuesta más ($17) si preguntan sobre precio. Si preguntan algo fuera de tema, regresa al sitio. Respuestas cortas y simples. No inventes hechos.";

var FALLBACK_EN = "$8.75 a month for a one-page website. Shop name, ZIP, phone, then Start. Photos by text after.";
var FALLBACK_ES = "$8.75 al mes por un sitio web de una página. Nombre de negocio, código postal, teléfono, luego Empezar. Fotos por mensaje después.";

async function postWebhook(url, data) {
  try {
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data)
    });
  } catch (e) {
  }
}

async function callGemini(messages, lang) {
  var apiKey = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;
  if (!apiKey) {
    return null;
  }

  var systemPrompt = lang === "es" ? SYSTEM_PROMPT_ES : SYSTEM_PROMPT_EN;
  var apiMessages = [
    { role: "system", content: systemPrompt }
  ].concat(messages);

  try {
    var res = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
      method: "POST",
      headers: {
        "authorization": "Bearer " + apiKey,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: apiMessages,
        max_tokens: 180,
        temperature: 0.7
      })
    });

    if (!res.ok) {
      return null;
    }

    var data = await res.json();
    if (data.choices && data.choices[0] && data.choices[0].message) {
      return data.choices[0].message.content;
    }
  } catch (e) {
  }

  return null;
}

module.exports = async function handler(req, res) {
  if (req.method === "POST") {
    var body = {};
    try {
      body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    } catch (e) {
      body = {};
    }

    var session = String(body.session || "").trim();
    var text = String(body.text || "").trim();
    var lang = String(body.lang || "en").trim();

    if (!session || !text) {
      res.status(400).json({ ok: false, error: "Need session and text." });
      return;
    }

    if (!globalThis.helpSessions[session]) {
      globalThis.helpSessions[session] = [];
    }

    var history = globalThis.helpSessions[session];
    var turnCount = history.filter(function (m) { return m.who === "me"; }).length;

    if (turnCount >= 30) {
      var closer = lang === "es"
        ? "Hemos hablado mucho. Comience en el formulario o lea las Preguntas Frecuentes."
        : "We've talked a lot. Start on the form, or read the FAQ.";
      res.status(200).json({ ok: true, reply: closer, closed: true });
      return;
    }

    history.push({ who: "me", text: text, when: new Date().toISOString() });

    var apiMessages = history.filter(function (m) {
      return m.who === "me" || m.who === "bot";
    }).slice(-8).map(function (m) {
      return { role: m.who === "me" ? "user" : "assistant", content: m.text };
    });

    var reply = await callGemini(apiMessages, lang);

    if (!reply) {
      reply = lang === "es" ? FALLBACK_ES : FALLBACK_EN;
    }

    history.push({ who: "bot", text: reply, when: new Date().toISOString() });

    var webhook = process.env.HELP_WEBHOOK;
    if (webhook) {
      postWebhook(webhook, { session: session, text: text, lang: lang, reply: reply, when: new Date().toISOString() }).catch(function () {});
    }

    res.status(200).json({ ok: true, reply: reply });
    return;
  }

  res.status(405).json({ ok: false });
};
