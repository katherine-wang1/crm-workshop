/*
 * Zip generator for the workshop skills. Runs entirely in the browser.
 *
 * - parseBaseUrl(): validate what the student pasted and pull out the Base ID.
 * - fillConfig():   fill the Base URL and Base ID lines of crm-config.txt.
 *                   Every other line is left as it is (time zone stays
 *                   America/Los_Angeles from the template).
 * - makeZip():      a plain "stored" (uncompressed) zip, the same layout as the
 *                   zips in Workshop Materials/skills: <skill>/SKILL.md and
 *                   <skill>/crm-config.txt. SKILL.md bytes are copied untouched.
 *
 * Nothing here sends the Base URL anywhere or saves it.
 * Also loaded by scripts/test-zip.mjs, so it avoids browser-only APIs at load time.
 */
(function (root) {
  "use strict";

  var TEMPLATE_BASE_ID = "app6pSBloIpR6pOLN"; // Kate's template base: students must use their own copy
  var PLACEHOLDER = "appXXXXXXXXXXXXXX";

  /* ---------- Base URL ---------- */

  function parseBaseUrl(input) {
    var raw = String(input || "").trim().replace(/^[<"'\s]+|[>"'\s]+$/g, "");
    if (!raw) return { ok: false, code: "empty", error: "Paste the link from your browser's address bar." };

    var appMatch = /(?:^|[^A-Za-z0-9])(app[A-Za-z0-9]{14})(?![A-Za-z0-9])/.exec(raw);
    var looksLikeUrl = /^(https?:\/\/|www\.|airtable\.com)/i.test(raw);

    if (looksLikeUrl) {
      var host = raw.replace(/^https?:\/\//i, "").split(/[\/?#]/)[0].toLowerCase();
      if (host !== "airtable.com" && host !== "www.airtable.com") {
        return { ok: false, code: "host", error: "That isn't an Airtable link. It should start with https://airtable.com/app…" };
      }
    } else if (!appMatch || appMatch[1] !== raw) {
      if (/^shr[A-Za-z0-9]{14}$/.test(raw)) {
        return { ok: false, code: "share", error: "That's a share link (it starts with shr). Open your own copy of the base and copy the address bar instead." };
      }
      return { ok: false, code: "format", error: "That doesn't look like a Base URL. It should start with https://airtable.com/app…" };
    }

    if (!appMatch) {
      if (/shr[A-Za-z0-9]{14}/.test(raw)) {
        return { ok: false, code: "share", error: "That's a share link (it has shr… in it), not your base. Open your own copy of the base and copy the address bar instead." };
      }
      if (raw.indexOf(PLACEHOLDER) >= 0) {
        return { ok: false, code: "placeholder", error: "That's the placeholder from the template file. Paste the link to your own base." };
      }
      return { ok: false, code: "noid", error: "We couldn't find a Base ID in that link. Open your base in Airtable and copy the whole address bar. It contains app… followed by 14 letters and numbers." };
    }

    var baseId = appMatch[1];
    if (baseId === PLACEHOLDER) {
      return { ok: false, code: "placeholder", error: "That's the placeholder from the template file. Paste the link to your own base." };
    }
    if (baseId === TEMPLATE_BASE_ID) {
      return { ok: false, code: "template", baseId: baseId, error: "That's the workshop template, not your copy. Open your copy (from your Airtable home page) and copy its address bar." };
    }
    return { ok: true, baseId: baseId, baseUrl: "https://airtable.com/" + baseId };
  }

  /* ---------- crm-config.txt ---------- */

  function fillConfig(template, base) {
    var lines = String(template).split("\n");
    var sawUrl = false, sawId = false;
    var out = lines.map(function (line) {
      if (/^Base URL:/.test(line)) { sawUrl = true; return "Base URL: " + base.baseUrl; }
      if (/^Base ID:/.test(line)) { sawId = true; return "Base ID: " + base.baseId; }
      if (/^# Replace appX+ /.test(line)) return "# Filled in by the AI@GSB workshop site with your Base URL and Base ID.";
      return line;
    }).join("\n");
    if (!sawUrl || !sawId) throw new Error("crm-config.txt template is missing a Base URL or Base ID line.");
    if (out.indexOf(PLACEHOLDER) >= 0) throw new Error("crm-config.txt still has the placeholder after filling.");
    return out;
  }

  /* ---------- zip writer (stored, no compression) ---------- */

  var CRC_TABLE = (function () {
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(bytes) {
    var c = 0xffffffff;
    for (var i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  function utf8(s) {
    if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(s);
    return Uint8Array.from(Buffer.from(s, "utf8")); // Node fallback
  }

  function dosTime(d) {
    return {
      time: ((d.getHours() & 31) << 11) | ((d.getMinutes() & 63) << 5) | ((d.getSeconds() / 2) & 31),
      date: (((d.getFullYear() - 1980) & 127) << 9) | (((d.getMonth() + 1) & 15) << 5) | (d.getDate() & 31),
    };
  }

  /** files: [{ name: "crm-company/SKILL.md", data: Uint8Array }] */
  function makeZip(files, when) {
    var t = dosTime(when || new Date());
    var parts = [], central = [], offset = 0;

    files.forEach(function (f) {
      var name = utf8(f.name), data = f.data, crc = crc32(data);
      var local = new DataView(new ArrayBuffer(30));
      local.setUint32(0, 0x04034b50, true);
      local.setUint16(4, 20, true);       // version needed
      local.setUint16(6, 0x0800, true);   // UTF-8 names
      local.setUint16(8, 0, true);        // stored
      local.setUint16(10, t.time, true);
      local.setUint16(12, t.date, true);
      local.setUint32(14, crc, true);
      local.setUint32(18, data.length, true);
      local.setUint32(22, data.length, true);
      local.setUint16(26, name.length, true);
      local.setUint16(28, 0, true);
      parts.push(new Uint8Array(local.buffer), name, data);

      var cen = new DataView(new ArrayBuffer(46));
      cen.setUint32(0, 0x02014b50, true);
      cen.setUint16(4, 0x031e, true);     // made by: unix, 3.0
      cen.setUint16(6, 20, true);
      cen.setUint16(8, 0x0800, true);
      cen.setUint16(10, 0, true);
      cen.setUint16(12, t.time, true);
      cen.setUint16(14, t.date, true);
      cen.setUint32(16, crc, true);
      cen.setUint32(20, data.length, true);
      cen.setUint32(24, data.length, true);
      cen.setUint16(28, name.length, true);
      cen.setUint16(30, 0, true);
      cen.setUint16(32, 0, true);
      cen.setUint16(34, 0, true);
      cen.setUint16(36, 0, true);
      cen.setUint32(38, 0x81a40000, true); // -rw-r--r--
      cen.setUint32(42, offset, true);
      central.push(new Uint8Array(cen.buffer), name);

      offset += 30 + name.length + data.length;
    });

    var cenSize = central.reduce(function (n, p) { return n + p.length; }, 0);
    var end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true);
    end.setUint16(8, files.length, true);
    end.setUint16(10, files.length, true);
    end.setUint32(12, cenSize, true);
    end.setUint32(16, offset, true);

    var all = parts.concat(central, [new Uint8Array(end.buffer)]);
    var total = all.reduce(function (n, p) { return n + p.length; }, 0);
    var out = new Uint8Array(total), pos = 0;
    all.forEach(function (p) { out.set(p, pos); pos += p.length; });
    return out;
  }

  /**
   * Build one skill zip.
   * skillMd: Uint8Array (raw bytes of SKILL.md, copied untouched)
   * configTemplate: string (crm-config.txt from the site's skills/ folder)
   */
  function buildSkillZip(skill, skillMd, configTemplate, base, when) {
    return makeZip([
      { name: skill + "/SKILL.md", data: skillMd },
      { name: skill + "/crm-config.txt", data: utf8(fillConfig(configTemplate, base)) },
    ], when);
  }

  var api = {
    TEMPLATE_BASE_ID: TEMPLATE_BASE_ID,
    parseBaseUrl: parseBaseUrl,
    fillConfig: fillConfig,
    makeZip: makeZip,
    buildSkillZip: buildSkillZip,
    crc32: crc32,
  };
  root.CRMZip = api;
})(typeof window !== "undefined" ? window : globalThis);
