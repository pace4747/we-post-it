if (!globalThis.helpSessions) {
  globalThis.helpSessions = {};
}

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

async function postGithubIssue(session, text, lang) {
  var token = process.env.GITHUB_TOKEN;
  if (!token) return;
  var repo = "pace4747/we-post-it";
  var title = "help " + session;
  var body = "**Session:** " + session + "\n**Language:** " + lang + "\n**Message:**\n\n" + text + "\n\n---\n\n_Auto-posted from help chat_";

  try {
    var searchUrl = "https://api.github.com/search/issues?q=repo:" + repo + "+in:title+" + encodeURIComponent(title);
    var searchRes = await fetch(searchUrl, {
      headers: {
        "authorization": "token " + token,
        "user-agent": "we-post-it-help"
      }
    });
    var searchData = await searchRes.json();
    if (searchData.total_count > 0) {
      var issueNum = searchData.items[0].number;
      var commentUrl = "https://api.github.com/repos/" + repo + "/issues/" + issueNum + "/comments";
      await fetch(commentUrl, {
        method: "POST",
        headers: {
          "authorization": "token " + token,
          "content-type": "application/json",
          "user-agent": "we-post-it-help"
        },
        body: JSON.stringify({ body: text })
      });
    } else {
      var createUrl = "https://api.github.com/repos/" + repo + "/issues";
      await fetch(createUrl, {
        method: "POST",
        headers: {
          "authorization": "token " + token,
          "content-type": "application/json",
          "user-agent": "we-post-it-help"
        },
        body: JSON.stringify({ title: title, body: body })
      });
    }
  } catch (e) {
  }
}

async function getGithubReplies(session) {
  var token = process.env.GITHUB_TOKEN;
  if (!token) return [];
  var repo = "pace4747/we-post-it";
  var title = "help " + session;

  try {
    var searchUrl = "https://api.github.com/search/issues?q=repo:" + repo + "+in:title+" + encodeURIComponent(title);
    var searchRes = await fetch(searchUrl, {
      headers: {
        "authorization": "token " + token,
        "user-agent": "we-post-it-help"
      }
    });
    var searchData = await searchRes.json();
    if (searchData.total_count > 0) {
      var issueNum = searchData.items[0].number;
      var commentsUrl = "https://api.github.com/repos/" + repo + "/issues/" + issueNum + "/comments";
      var commentsRes = await fetch(commentsUrl, {
        headers: {
          "authorization": "token " + token,
          "user-agent": "we-post-it-help"
        }
      });
      var comments = await commentsRes.json();
      return comments.map(function (c) {
        return { who: "bot", text: c.body };
      });
    }
  } catch (e) {
  }
  return [];
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
    globalThis.helpSessions[session].push({ who: "me", text: text, when: new Date().toISOString() });

    var webhook = process.env.HELP_WEBHOOK;
    if (webhook) {
      postWebhook(webhook, { session: session, text: text, lang: lang, when: new Date().toISOString() });
    }

    postGithubIssue(session, text, lang);

    res.status(200).json({ ok: true, session: session });
    return;
  }

  if (req.method === "GET") {
    var session = String(req.query.session || "").trim();
    if (!session) {
      res.status(400).json({ ok: false, error: "Need session." });
      return;
    }

    var messages = globalThis.helpSessions[session] || [];
    var githubReplies = await getGithubReplies(session);
    var allMessages = messages.concat(githubReplies);

    res.status(200).json({ ok: true, messages: allMessages });
    return;
  }

  res.status(405).json({ ok: false });
};
