if (!globalThis.helpSessions) {
  globalThis.helpSessions = {};
}

var SYSTEM_PROMPT_EN = "You are the We Post It site helper. Only talk about this website and why We Post It is a good deal. Price is $9.99 a month. Stop whenever. One extra customer a year pays for it (about $120 a year). We start Google, a Facebook page, and a one-page website. Same name, ZIP, phone everywhere. They text photos after they start. We post them. Old photos are fine. A pile gets spaced out. If they already have Google, we copy hours, address, and category from that listing. The first photo they text is the profile picture on Google, Facebook, and the page. Google is setup help, not sold. We never take a password. They stay owner. You keep Google and Facebook. Website is one page. No fake posts, no invented jobs, no rank promises. Referral: If you already pay, text us another shop's name and phone. After they pay $9.99, you get one month free. That stacks. They do not get a free month. If they get a refund, that free month comes off. A shop that is not paying cannot earn this. No portal, no codes. For full referral rules, point to /legal. English and Spanish: match the visitor. Legal questions: say that is on the User Agreement at /legal and stop. Do not explain legal. Do not talk about other products except that Wix and Hootsuite cost more ($17 and $99) if they ask about price. If they ask anything off-topic, steer back to the site. Short plain answers. Do not invent facts.";

var SYSTEM_PROMPT_ES = "Eres el asistente del sitio We Post It. Solo habla de este sitio web y por qué We Post It es una buena oferta. El precio es $9.99 al mes. Cancela cuando quieras. Un cliente extra al año lo paga (unos $120 al año). Empezamos Google, una página de Facebook y un sitio web de una página. Mismo nombre, código postal, teléfono en todas partes. Envían fotos por mensaje después de empezar. Las publicamos. Fotos viejas están bien. Un montón se espacian. Si ya tienen Google, copiamos horario, dirección y categoría de ese listado. La primera foto que envían es la foto de perfil en Google, Facebook y la página. Google es ayuda de configuración, no se vende. Nunca tomamos contraseña. Ellos siguen siendo dueños. Te quedas con Google y Facebook. El sitio web es de una página. Sin publicaciones falsas, sin trabajos inventados, sin promesas de ranking. Referencias: Si ya paga, mándenos el nombre y teléfono de otro negocio. Cuando paguen $9.99, usted recibe un mes gratis. Eso se acumula. Ellos no reciben mes gratis. Si les devuelven el dinero, ese mes gratis se quita. Un negocio que no paga no puede ganar esto. Sin portal, sin códigos. Para las reglas completas de referencias, señala /legal. Inglés y español: iguala al visitante. Preguntas legales: di que está en el Acuerdo de Usuario en /legal y para. No expliques lo legal. No hables de otros productos excepto que Wix y Hootsuite cuestan más ($17 y $99) si preguntan sobre precio. Si preguntan algo fuera de tema, regresa al sitio. Respuestas cortas y simples. No inventes hechos.";

var FALLBACK_EN = "$9.99 a month. Shop name, ZIP, phone, then Start. Photos by text after.";
var FALLBACK_ES = "$9.99 al mes. Nombre de negocio, código postal, teléfono, luego Empezar. Fotos por mensaje después.";

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
