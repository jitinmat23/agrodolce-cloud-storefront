import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
export function openStore(directory) {
  mkdirSync(directory,{recursive:true,mode:0o700});
  const db=new DatabaseSync(join(directory,'requests.sqlite'));
  db.exec(`PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS requests (id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, payload TEXT NOT NULL, preview INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS notifications (request_id TEXT NOT NULL, channel TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0, next_attempt INTEGER NOT NULL DEFAULT 0, provider_id TEXT, PRIMARY KEY(request_id, channel));`);
  db.exec(`CREATE TABLE IF NOT EXISTS subscribers (
    id INTEGER PRIMARY KEY,
    channel TEXT NOT NULL,
    destination TEXT NOT NULL,
    consent_version TEXT NOT NULL,
    subscribed_at TEXT NOT NULL,
    preview INTEGER NOT NULL,
    UNIQUE(channel, destination, preview)
  );`);
  return {
    subscribeAll(subscriptions, preview) {
      db.exec('BEGIN');
      try {
        const insert = db.prepare(`INSERT INTO subscribers
          (channel, destination, consent_version, subscribed_at, preview)
          VALUES (?, ?, 'new-products-v1', ?, ?)
          ON CONFLICT(channel, destination, preview) DO NOTHING`);
        for (const { channel, destination } of subscriptions) {
          insert.run(channel, destination, new Date().toISOString(), Number(preview));
        }
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
    save(request,preview){
      const {createdAt,...stable}=request;
      const fingerprint=createHash('sha256').update(JSON.stringify({...stable,preview})).digest('hex');
      const existing=db.prepare('SELECT fingerprint FROM requests WHERE id=?').get(request.id);
      if(existing){if(existing.fingerprint!==fingerprint){const e=new Error('This submission changed. Please refresh and submit again.');e.status=409;throw e;}return false;}
      db.exec('BEGIN');try{db.prepare('INSERT INTO requests VALUES (?,?,?,?)').run(request.id,fingerprint,JSON.stringify(request),Number(preview));if(!preview)for(const channel of ['email','whatsapp'])db.prepare('INSERT INTO notifications (request_id,channel) VALUES (?,?)').run(request.id,channel);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}return true;
    },
    pending(){return db.prepare("SELECT n.*, r.payload FROM notifications n JOIN requests r ON r.id=n.request_id WHERE n.state='pending' AND n.next_attempt<=? LIMIT 20").all(Date.now());},
    accepted(id,channel,providerId){db.prepare("UPDATE notifications SET state='provider_accepted',provider_id=? WHERE request_id=? AND channel=?").run(providerId,id,channel);},
    retry(id,channel,attempts){db.prepare("UPDATE notifications SET attempts=?,next_attempt=?,state=? WHERE request_id=? AND channel=?").run(attempts,Date.now()+Math.min(3600000,30000*2**attempts),attempts>=10?'failed':'pending',id,channel);},
    close(){db.close();}
  };
}
