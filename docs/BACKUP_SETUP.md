# Backup & Keepalive Setup — Zero+ (100% free tier)

## 1. Where the files go
In your repo, create the folder `.github/workflows/` (note: real folder name has a
dot and a slash — `.github/workflows/`, not `.github-workflows`) and put both
files inside it:

```
.github/workflows/backup.yml
.github/workflows/keepalive.yml
```

## 2. Cloudflare R2 — create a backup bucket + API key
1. Cloudflare dashboard → R2 → Create bucket → name it `zeroplus-db-backups`
   (keep it separate from the bucket that stores product files — if one
   bucket/account gets compromised, the other is untouched).
2. R2 → Manage API Tokens → Create API Token → permissions: Object Read & Write,
   scoped to the `zeroplus-db-backups` bucket only.
3. Copy the Access Key ID, Secret Access Key, and the endpoint URL
   (`https://<account_id>.r2.cloudflarestorage.com`).
4. (Optional but recommended) In the bucket settings, add a lifecycle rule:
   delete objects older than 30 days — keeps storage small and free
   automatically instead of you doing manual cleanup.

## 3. Supabase — get your database connection string
Project Settings → Database → Connection string → URI (use the "Session
pooler" one). It looks like:
`postgresql://postgres.xxxx:[PASSWORD]@aws-x-xx-xxxx-x.pooler.supabase.com:5432/postgres`

## 4. healthchecks.io — free dead-man's-switch monitor
1. Sign up free at healthchecks.io → Create check → name it "zero+ db backup".
2. Set the expected schedule to "Every 1 day".
3. Copy the ping URL it gives you (looks like `https://hc-ping.com/xxxxxxxx`).
4. This is the piece that solves the "cron fails silently" problem — if the
   backup workflow doesn't ping it within 24h, healthchecks.io emails you.

## 5. Add the secrets to GitHub
Repo → Settings → Secrets and variables → Actions → New repository secret.
Add all five:

| Secret name              | Value                                      |
|---------------------------|---------------------------------------------|
| SUPABASE_DB_URL           | the connection string from step 3           |
| R2_ACCESS_KEY_ID          | from step 2                                  |
| R2_SECRET_ACCESS_KEY      | from step 2                                  |
| R2_ENDPOINT               | from step 2                                  |
| HEALTHCHECK_PING_URL      | from step 4                                  |

## 6. Test it
Repo → Actions tab → "Database Backup" → Run workflow (manual trigger).
Watch it go green, then check:
- the R2 bucket has a new `backup_...dump` file
- healthchecks.io shows a green "last ping" timestamp

## 7. If you ever need to restore
```bash
pg_restore --clean --if-exists -d "$SUPABASE_DB_URL" backup_2026-07-19_02-00.dump
```
Download the dump file from the R2 bucket first (via the Cloudflare dashboard
or `aws s3 cp` with the same credentials), then run the command above.

## What this setup does and doesn't fix
- Fixes: backups now happen automatically every day, get stored off-platform,
  and you get alerted the same day if the job stops running — instead of
  finding out only when you need to restore.
- Does not fix: this is still a daily snapshot, not point-in-time recovery.
  Worst case you lose up to ~24h of orders, not a full week. If that's still
  too much once the store has real volume, that's the point where upgrading
  to Supabase's paid backup tier becomes worth it.
