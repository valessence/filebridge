# Deploy FileBridge on Oracle Cloud (Free)

Total cost: **$0/month** (plus an optional free DuckDNS subdomain).

You need:
- An email address
- A credit/debit card (Oracle verifies identity — you are not charged if you stay on Always Free resources)
- About 45–60 minutes

---

## Part 1 — Create your Oracle Cloud account

1. Go to [https://www.oracle.com/cloud/free/](https://www.oracle.com/cloud/free/)
2. Click **Start for free** and create an account.
3. Complete verification (email + card). You stay on the free tier as long as you pick **Always Free** shapes only.

---

## Part 2 — Create a free server (VM)

1. Log in to [Oracle Cloud Console](https://cloud.oracle.com/)
2. Top-left menu → **Compute** → **Instances** → **Create instance**
3. Name it: `filebridge`
4. **Image:** Ubuntu 24.04 (or 22.04)
5. **Shape:** Click **Change shape**
   - Select **Ampere** (ARM)
   - Pick **VM.Standard.A1.Flex**
   - Set **1 OCPU** and **6 GB memory** (fits free tier)
6. **Networking:** Use the default VCN
7. **Add SSH keys:**
   - Choose **Generate a key pair for me**
   - Click **Save private key** — store `ssh-key-*.key` somewhere safe on your PC
8. Click **Create**
9. Wait until the instance status is **Running**
10. Copy the **Public IP address** (e.g. `123.45.67.89`)

### Open ports in Oracle (required!)

1. On the instance page, click your **Subnet** link (under Instance details → Primary VNIC)
2. Click the **Security list** name
3. Click **Add ingress rules** and add these two rules:

| Source CIDR | Protocol | Dest port |
|-------------|----------|-----------|
| `0.0.0.0/0` | TCP | `80` |
| `0.0.0.0/0` | TCP | `443` |

4. Click **Add ingress rules**

---

## Part 3 — Get a free web address (DuckDNS)

Browsers need HTTPS for file sharing. DuckDNS gives you a free subdomain.

1. Go to [https://www.duckdns.org/](https://www.duckdns.org/) and sign in (Google/GitHub works)
2. Create a subdomain, e.g. `myfilebridge` → you get `myfilebridge.duckdns.org`
3. Set the **IP address** to your Oracle **Public IP** from Part 2
4. Click **update ip**

---

## Part 4 — Upload the app to your server

### Option A — Using Windows PowerShell (no GitHub needed)

1. On your PC, zip the entire `app` folder
2. Open PowerShell and connect (replace IP and key path):

```powershell
ssh -i "C:\path\to\ssh-key.key" ubuntu@YOUR_PUBLIC_IP
```

3. On the server, install Docker:

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-v2 unzip
sudo usermod -aG docker ubuntu
exit
```

4. Log out and back in so Docker permissions apply:

```powershell
ssh -i "C:\path\to\ssh-key.key" ubuntu@YOUR_PUBLIC_IP
```

5. From your PC, upload the zip (new PowerShell window):

```powershell
scp -i "C:\path\to\ssh-key.key" "C:\path\to\app.zip" ubuntu@YOUR_PUBLIC_IP:~/
```

6. On the server:

```bash
mkdir -p ~/filebridge && unzip ~/app.zip -d ~/filebridge
cd ~/filebridge/app
```

(Adjust the folder name if your zip extracts differently — you want to be inside the folder that contains `docker-compose.oracle.yml`.)

### Option B — Using GitHub

Push the project to GitHub, then on the server:

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO/app
```

---

## Part 5 — Configure and launch

On the server, inside the `app` folder:

```bash
cp .env.oracle.example .env
nano .env
```

Set these two lines (use your real values):

```
DOMAIN=myfilebridge.duckdns.org
APP_SECRET=any-long-random-phrase-you-invent-abc123xyz
```

Save: `Ctrl+O`, Enter, then `Ctrl+X`.

Run the setup script:

```bash
chmod +x scripts/oracle-setup.sh
./scripts/oracle-setup.sh
```

Wait 1–2 minutes, then open **https://myfilebridge.duckdns.org** in your browser.

---

## Part 6 — Share with users

Send people your link. On the same Wi‑Fi:

1. Open your site
2. Enter the same room code (e.g. `livingroom`)
3. Select the other device and send files

Room invite link example: `https://myfilebridge.duckdns.org?room=livingroom`

---

## Troubleshooting

**Site won't load**
- Check DuckDNS IP matches your Oracle public IP
- Confirm ingress rules for ports 80 and 443 exist
- Run `docker compose -f docker-compose.oracle.yml logs` on the server

**"Signaling unavailable" in the app**
- Wait for containers to finish starting: `docker compose -f docker-compose.oracle.yml ps`
- Restart: `docker compose -f docker-compose.oracle.yml restart`

**HTTPS certificate errors**
- DuckDNS domain must point to the server IP before starting Caddy
- Restart caddy: `docker compose -f docker-compose.oracle.yml restart caddy`

**Update the app later**

```bash
cd ~/filebridge/app
# re-upload new files or git pull
./scripts/oracle-setup.sh
```