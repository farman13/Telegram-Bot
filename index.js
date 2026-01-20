import { Telegraf, Markup } from "telegraf";
import dotenv from "dotenv";
import vm from "vm";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN);

// ================= CONFIG =================
const COOLDOWN = 1 * 30 * 1000; // 1 minute
const userCooldown = new Map();
const userLanguage = new Map();

// ================= HELPERS =================
const isCooldown = (id) =>
    userCooldown.has(id) && Date.now() - userCooldown.get(id) < COOLDOWN;

const setCooldown = (id) => userCooldown.set(id, Date.now());

// ================= START =================
bot.start((ctx) => {
    ctx.reply(
        "👋 Select the language you want to run:",
        Markup.inlineKeyboard([
            [Markup.button.callback("🟨 JavaScript", "LANG_JS")],
            [Markup.button.callback("🐍 Python", "LANG_PY")],
        ])
    );
});

// ================= BUTTON HANDLERS =================
bot.action("LANG_JS", (ctx) => {
    userLanguage.set(ctx.from.id, "js");
    ctx.reply("✅ JavaScript selected.\nSend your JS code now.");
});

bot.action("LANG_PY", (ctx) => {
    userLanguage.set(ctx.from.id, "py");
    ctx.reply("✅ Python selected.\nSend your Python code now.");
});

// ================= CODE EXECUTION =================
bot.on("text", async (ctx) => {
    const userId = ctx.from.id;

    if (!userLanguage.has(userId)) {
        return ctx.reply("❗ Please select a language first using /start.");
    }

    if (isCooldown(userId)) {
        return ctx.reply("⛔ Please wait for 30sec before sending another code.");
    }

    setCooldown(userId);

    const code = ctx.message.text;
    const lang = userLanguage.get(userId);

    // ================= JAVASCRIPT =================
    if (lang === "js") {
        try {
            let output = "";

            const sandbox = {
                console: {
                    log: (...args) => {
                        output += args.join(" ") + "\n";
                    },
                },
            };

            vm.createContext(sandbox);
            vm.runInContext(code, sandbox, { timeout: 1000 });

            return ctx.reply(output || "✅ JS executed successfully");
        } catch (e) {
            return ctx.reply(`❌ JS Error:\n${e.message}`);
        }
    }

    // ================= PYTHON (WINDOWS SAFE) =================
    if (lang === "py") {
        try {
            const tmpFile = path.join(os.tmpdir(), `tg_code_${userId}.py`);
            fs.writeFileSync(tmpFile, code);

            exec(
                `python "${tmpFile}"`,
                { timeout: 2000 },
                (err, stdout, stderr) => {
                    fs.unlinkSync(tmpFile);

                    if (err) return ctx.reply(`❌ Python Error:\n${err.message}`);
                    if (stderr) return ctx.reply(`❌ Python Error:\n${stderr}`);

                    ctx.reply(stdout || "✅ Python executed successfully");
                }
            );
        } catch (e) {
            return ctx.reply(`❌ Python Error:\n${e.message}`);
        }
    }
});

// ================= LAUNCH =================
bot.launch();
console.log("🤖 Compiler Bot with Buttons running...");
