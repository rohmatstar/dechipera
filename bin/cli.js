#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const args = process.argv.slice(2);
const targetDir = args[0] || ".";
const mode = args.includes("--dec") ? "decrypt" : "encrypt";
const envPath = path.join(targetDir, ".env");
const encPath = path.join(targetDir, "env.enc");
const configPath = path.join(targetDir, "firebaseConfig.js");

const firebaseKeys = [
  "apiKey",
  "authDomain",
  "projectId",
  "storageBucket",
  "messagingSenderId",
  "appId",
  "measurementId",
];

function generateRandomPort() {
  return Math.floor(1000 + Math.random() * 9000);
}

function encrypt(text, password) {
  const iv = crypto.randomBytes(16);
  const key = crypto.createHash("sha256").update(password).digest();
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

function decrypt(encryptedText, password) {
  const [ivHex, dataHex] = encryptedText.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const encryptedData = Buffer.from(dataHex, "hex");
  const key = crypto.createHash("sha256").update(password).digest();
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  const decrypted = Buffer.concat([
    decipher.update(encryptedData),
    decipher.final(),
  ]);
  return decrypted.toString();
}

(async () => {
  try {
    const folderName = path.basename(path.resolve(targetDir));
    const password = folderName;

    if (mode === "decrypt") {
      if (!fs.existsSync(encPath)) {
        console.warn("⚠️  env.enc tidak ditemukan");
        return;
      }
      const encrypted = fs.readFileSync(encPath, "utf8");
      const decrypted = decrypt(encrypted, password);
      fs.writeFileSync(envPath, decrypted);
      console.log("✅ Berhasil didekripsi ke .env");
      return;
    }

    // ENCRYPT MODE
    let envData = `PORT=${generateRandomPort()}\n`;

    if (fs.existsSync(configPath)) {
      const configModule = require(path.resolve(configPath));
      if (typeof configModule !== "object")
        throw new Error("firebaseConfig.js harus export object");

      firebaseKeys.forEach((key) => {
        const val = configModule[key] || "";
        envData += `${key.toUpperCase()}=${val}\n`;
      });

      fs.unlinkSync(configPath); // delete config
    } else {
      const blankTemplate = `module.exports = {\n${firebaseKeys
        .map((k) => `  ${k}: "",`)
        .join("\n")}\n};\n`;
      fs.writeFileSync(configPath, blankTemplate);
      console.log(
        "✅ firebaseConfig.js belum ada, template dibuat. Silakan isi dan jalankan ulang."
      );
      return;
    }

    fs.writeFileSync(envPath, envData);

    const encrypted = encrypt(envData, password);
    fs.writeFileSync(encPath, encrypted);
    fs.unlinkSync(envPath);
    console.log("✅ .env berhasil dienkripsi ke env.enc");
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
})();
