import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent, FormEvent } from 'react';
import { authClient } from './lib/auth';
import {
  Archive, ArrowDownToLine, ArrowLeft, Check, ChevronDown, Cloud, File as FileIcon,
  FileArchive, FileAudio, FileImage, FileText, FileVideo, Grid2X2, HardDrive,
  LayoutDashboard, LoaderCircle, LogOut, MoreHorizontal, Search, ShieldCheck,
  Star, Trash2, UploadCloud, X,
} from 'lucide-react';
import { apiRequest } from './lib/api';

type DriveFile = {
  id: string;
  user_id: string;
  name: string;
  object_path: string;
  mime_type: string;
  size_bytes: number;
  is_favorite: boolean;
  created_at: string;
  deleted_at: string | null;
};

type Page = 'all' | 'starred' | 'trash';

const prettyBytes = (n: number) => {
  if (!Number.isFinite(n) || n <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), units.length - 1);
  return `${(n / Math.pow(1024, i)).toLocaleString('id-ID', { maximumFractionDigits: i ? 1 : 0 })} ${units[i]}`;
};
const dateLabel = (s: string) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(s));
const fileKind = (file: DriveFile) => {
  const mime = file.mime_type || '';
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (mime.startsWith('image/') || ['png','jpg','jpeg','gif','webp','svg','heic'].includes(ext || '')) return 'image';
  if (mime.startsWith('video/') || ['mp4','mov','mkv','webm'].includes(ext || '')) return 'video';
  if (mime.startsWith('audio/') || ['mp3','wav','aac','flac'].includes(ext || '')) return 'audio';
  if (mime.includes('pdf') || ['doc','docx','txt','rtf','odt','xls','xlsx','ppt','pptx','csv'].includes(ext || '')) return 'document';
  if (['zip','rar','7z','tar','gz'].includes(ext || '')) return 'archive';
  return 'other';
};
function FileGlyph({ file, large = false }: { file: DriveFile; large?: boolean }) {
  const kind = fileKind(file);
  const Icon = kind === 'image' ? FileImage : kind === 'video' ? FileVideo : kind === 'audio' ? FileAudio : kind === 'archive' ? FileArchive : kind === 'document' ? FileText : FileIcon;
  return <span className={`file-glyph ${kind} ${large ? 'large' : ''}`}><Icon size={large ? 25 : 19} strokeWidth={1.8} /></span>;
}
function initials(name?: string | null) {
  return (name || 'Pengguna').split(/[ @._-]/).filter(Boolean).slice(0, 2).map(x => x[0]?.toUpperCase()).join('') || 'RA';
}

export default function App() {
  const { data: session, isPending: authBusy } = authClient.useSession();
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authNotice, setAuthNotice] = useState('');
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [page, setPage] = useState<Page>('all');
  const [query, setQuery] = useState('');
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [view, setView] = useState<'list' | 'grid'>('list');
  const inputRef = useRef<HTMLInputElement>(null);
  const user = session?.user;


  const loadFiles = useCallback(async () => {
    if (!session?.user) { setFiles([]); return; }
    setLoadingFiles(true);
    try { const data = await apiRequest<DriveFile[]>('/api/files'); setFiles(data); setError(''); }
    catch (e) { setError(`Tidak dapat memuat berkas: ${e instanceof Error ? e.message : 'Kesalahan jaringan.'}`); }
    finally { setLoadingFiles(false); }
  }, [session?.user?.id]);

  useEffect(() => { void loadFiles(); }, [loadFiles]);

  const activeFiles = useMemo(() => {
    const base = files.filter(f => page === 'trash' ? Boolean(f.deleted_at) : !f.deleted_at && (page !== 'starred' || f.is_favorite));
    const q = query.trim().toLocaleLowerCase('id-ID');
    return q ? base.filter(f => f.name.toLocaleLowerCase('id-ID').includes(q)) : base;
  }, [files, page, query]);
  const currentBytes = useMemo(() => files.filter(f => !f.deleted_at).reduce((a, f) => a + Number(f.size_bytes || 0), 0), [files]);
  const allCount = files.filter(f => !f.deleted_at).length;
  const starredCount = files.filter(f => !f.deleted_at && f.is_favorite).length;

  const signIn = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError(''); setAuthNotice(''); setAuthSubmitting(true);
    try {
      const result = authMode === 'login'
        ? await authClient.signIn.email({ email: email.trim(), password })
        : await authClient.signUp.email({ name: email.trim().split('@')[0] || 'Pengguna', email: email.trim(), password });
      if (result.error) setAuthError(result.error.message || 'Permintaan autentikasi gagal.');
      else if (authMode === 'signup') setAuthNotice('Akun berhasil dibuat. Jika konfirmasi email diaktifkan, periksa kotak masuk Anda.');
    } catch (e) { setAuthError(e instanceof Error ? e.message : 'Autentikasi gagal.'); }
    finally { setAuthSubmitting(false); }
  };
  const googleSignIn = async () => {
    setAuthError('');
    try { const result = await authClient.signIn.social({ provider: 'google', callbackURL: window.location.origin }); if (result.error) setAuthError(result.error.message || 'Permintaan autentikasi gagal.'); }
    catch (e) { setAuthError(e instanceof Error ? e.message : 'Login Google gagal.'); }
  };
  const signOut = async () => { await authClient.signOut(); setFiles([]); setPage('all'); };

  const uploadFiles = async (incoming: FileList | File[]) => {
    if (!user || !incoming.length) return;
    setUploading(true); setError(''); setNotice('');
    let succeeded = 0;
    for (const file of Array.from(incoming)) {
      const safeName = file.name.replace(/[\\/]/g, '_').trim() || 'berkas';
      try {
        await apiRequest<DriveFile>('/api/files?name=' + encodeURIComponent(safeName), { method: 'POST', headers: { 'Content-Type': file.type || 'application/octet-stream', 'X-File-Size': String(file.size) }, body: file });
        succeeded++;
      } catch (e) { setError(`Gagal mengunggah “${file.name}”: ${e instanceof Error ? e.message : 'Kesalahan jaringan.'}`); }
    }
    setUploading(false);
    if (succeeded) setNotice(`${succeeded} berkas berhasil disimpan dengan akses privat.`);
    if (inputRef.current) inputRef.current.value = '';
    await loadFiles();
  };
  const onInput = (e: ChangeEvent<HTMLInputElement>) => { if (e.target.files) void uploadFiles(e.target.files); };
  const onDrop = (e: DragEvent<HTMLElement>) => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files.length) void uploadFiles(e.dataTransfer.files); };

  const downloadFile = async (file: DriveFile) => {
    setError(''); setNotice('');
    try { const link = document.createElement('a'); link.href = `/api/files/${encodeURIComponent(file.id)}/download`; link.download = file.name; link.rel = 'noopener'; document.body.appendChild(link); link.click(); link.remove(); setNotice(`Unduhan dimulai untuk ${file.name}.`); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unduhan gagal.'); }
  };
  const toggleFavorite = async (file: DriveFile) => {
    try { await apiRequest(`/api/files/${encodeURIComponent(file.id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_favorite: !file.is_favorite }) }); await loadFiles(); } catch (e) { setError(e instanceof Error ? e.message : 'Pembaruan gagal.'); }
  };
  const moveToTrash = async (file: DriveFile) => {
    try { await apiRequest(`/api/files/${encodeURIComponent(file.id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deleted_at: new Date().toISOString() }) }); setNotice(`“${file.name}” dipindahkan ke Sampah.`); await loadFiles(); } catch (e) { setError(e instanceof Error ? e.message : 'Pembaruan gagal.'); }
  };
  const restoreFile = async (file: DriveFile) => {
    try { await apiRequest(`/api/files/${encodeURIComponent(file.id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deleted_at: null }) }); setNotice('Berkas dipulihkan.'); await loadFiles(); } catch (e) { setError(e instanceof Error ? e.message : 'Pemulihan gagal.'); }
  };
  const permanentlyDelete = async (file: DriveFile) => {
    if (!window.confirm(`Hapus permanen “${file.name}”? Tindakan ini tidak dapat dibatalkan.`)) return;
    try { await apiRequest(`/api/files/${encodeURIComponent(file.id)}`, { method: 'DELETE' }); setNotice('Berkas dihapus permanen.'); await loadFiles(); } catch (e) { setError(e instanceof Error ? e.message : 'Penghapusan gagal.'); }
  };

  if (authBusy) return <main className="center-loader"><LoaderCircle className="spin" size={28} /><span>Menyiapkan ruang Anda…</span></main>;
  if (!session) return <main className="auth-page">
    <section className="auth-art"><div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" /><div className="art-cloud"><Cloud size={104} strokeWidth={1.1} /><span className="float-card card-a"><FileText size={25}/></span><span className="float-card card-b"><FileImage size={23}/></span><span className="float-card card-c"><Archive size={22}/></span></div><div className="art-copy"><span className="eyebrow light">TEMPAT BARU UNTUK BERKAS ANDA</span><h1>Ruang luas.<br/><em>Pikiran lega.</em></h1><p>Semua yang penting, tertata di satu ruang pribadi.</p><div className="art-proof"><ShieldCheck size={16}/> Privat sejak pertama disimpan</div></div><span className="art-footer">RUANGAWAN · SIMPAN YANG BERARTI</span></section>
    <section className="auth-form-wrap"><div className="auth-form"><Brand /><span className="eyebrow">RUANG PRIBADI ANDA</span><h2>{authMode === 'login' ? 'Selamat datang kembali.' : 'Mulai ruang Anda.'}</h2><p className="muted">{authMode === 'login' ? 'Masuk untuk melanjutkan ke berkas Anda.' : 'Buat akun untuk menyimpan berkas dengan aman.'}</p>
    <button className="google-button" onClick={() => void googleSignIn()} type="button"><span className="google-mark">G</span> Lanjutkan dengan Google</button>
    <div className="or-divider"><span>atau dengan email</span></div>
    <form onSubmit={signIn} className="login-fields"><label>Email<input value={email} onChange={e => setEmail(e.target.value)} type="email" autoComplete="email" placeholder="nama@email.com" required /></label><label>Kata sandi<input value={password} onChange={e => setPassword(e.target.value)} type="password" autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} minLength={8} placeholder="Minimal 8 karakter" required /></label>{authError && <div className="inline-error">{authError}</div>}{authNotice && <div className="inline-success">{authNotice}</div>}<button className="primary-button full" disabled={authSubmitting}>{authSubmitting ? <LoaderCircle className="spin" size={17}/> : authMode === 'login' ? 'Masuk ke RuangAwan' : 'Buat akun'}</button></form>
    <p className="switch-auth">{authMode === 'login' ? 'Belum punya akun?' : 'Sudah punya akun?'} <button onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthError(''); setAuthNotice(''); }} type="button">{authMode === 'login' ? 'Daftar sekarang' : 'Masuk'}</button></p><p className="privacy-note"><ShieldCheck size={15}/> File Anda tidak bersifat publik. Masuk hanya dengan akun Anda.</p></div></section>
  </main>;

  const title = page === 'all' ? 'Semua berkas' : page === 'starred' ? 'Favorit Anda' : 'Sampah';
  return <main className="app-shell" onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false); }} onDrop={onDrop}>
    {dragging && <div className="drop-overlay"><div><UploadCloud size={43}/><h2>Lepaskan untuk menyimpan</h2><p>Berkas akan diunggah ke ruang privat Anda.</p></div></div>}
    <aside className="sidebar"><Brand /><button className="new-upload" onClick={() => inputRef.current?.click()} disabled={uploading}><UploadCloud size={18}/>{uploading ? 'Mengunggah…' : 'Unggah berkas'}<span className="plus">+</span></button><span className="nav-caption">RUANG SAYA</span><nav>
      <button className={page === 'all' ? 'nav-item selected' : 'nav-item'} onClick={() => setPage('all')}><LayoutDashboard size={18}/><span>Semua berkas</span><small>{allCount}</small></button>
      <button className={page === 'starred' ? 'nav-item selected' : 'nav-item'} onClick={() => setPage('starred')}><Star size={18}/><span>Favorit</span><small>{starredCount}</small></button>
      <button className={page === 'trash' ? 'nav-item selected' : 'nav-item'} onClick={() => setPage('trash')}><Trash2 size={18}/><span>Sampah</span></button>
    </nav><div className="sidebar-bottom"><div className="storage-icon"><HardDrive size={17}/><span>PENYIMPANAN</span><ChevronDown size={14}/></div><div className="storage-track"><span style={{ width: '0%' }}/></div><p className="storage-copy">{prettyBytes(currentBytes)} digunakan</p><div className="private-note"><ShieldCheck size={16}/><div><b>Ruang privat</b><span>Hanya Anda yang memiliki akses.</span></div></div></div></aside>
    <section className="main-area"><header className="topbar"><div className="breadcrumb"><span>Ruang saya</span><span className="crumb-slash">/</span><b>{title}</b></div><div className="top-actions"><label className="search-box"><Search size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari berkas…" /><kbd>⌘ K</kbd></label><div className="user-menu"><span className="user-avatar">{initials(user?.email)}</span><div><b>{user?.name || user?.email?.split('@')[0] || 'Pengguna'}</b><small>Ruang pribadi</small></div><button title="Keluar" aria-label="Keluar" onClick={() => void signOut()}><LogOut size={17}/></button></div></div></header>
      <div className="content-area"><div className="welcome-row"><div><span className="eyebrow">RUANG DIGITAL ANDA</span><h1>{page === 'all' ? <>Simpan yang <em>berarti.</em></> : title}</h1><p>{page === 'all' ? 'Semua hal penting, satu tempat yang terasa milik Anda.' : page === 'starred' ? 'Akses cepat untuk berkas yang sering Anda perlukan.' : 'Berkas yang dihapus tersimpan di sini sampai dihapus permanen.'}</p></div><div className="welcome-buttons"><button className="icon-button" title="Tampilan daftar" onClick={() => setView('list')} aria-label="Tampilan daftar"><Archive size={17}/></button><button className="icon-button" title="Tampilan kisi" onClick={() => setView('grid')} aria-label="Tampilan kisi"><Grid2X2 size={17}/></button><button className="primary-button" onClick={() => inputRef.current?.click()} disabled={uploading}><UploadCloud size={17}/> Unggah</button><input ref={inputRef} type="file" multiple onChange={onInput} hidden /></div></div>
      <div className="stat-row"><div className="stat-card"><span className="stat-symbol lilac"><FileIcon size={17}/></span><div><small>BERKAS AKTIF</small><b>{allCount} <span>item</span></b></div><span className="stat-foot">tersimpan</span></div><div className="stat-card"><span className="stat-symbol mint"><HardDrive size={17}/></span><div><small>RUANG TERPAKAI</small><b>{prettyBytes(currentBytes)}</b></div><span className="stat-foot">total berkas aktif</span></div><div className="stat-card accent-stat"><span className="stat-symbol peach"><Star size={17}/></span><div><small>BERKAS FAVORIT</small><b>{starredCount} <span>item</span></b></div><span className="stat-foot">akses cepat</span></div></div>
      {notice && <div className="notice success-notice"><Check size={16}/>{notice}<button onClick={() => setNotice('')} aria-label="Tutup"><X size={15}/></button></div>}{error && <div className="notice error-notice"><X size={16}/>{error}<button onClick={() => setError('')} aria-label="Tutup"><X size={15}/></button></div>}
      {page === 'all' && !query && <section className="upload-zone" onClick={() => inputRef.current?.click()} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}><span className="upload-illustration"><UploadCloud size={27}/></span><div><b>{uploading ? 'Berkas sedang diunggah…' : 'Lempar berkas ke sini'}</b><span>{uploading ? 'Jangan tutup halaman sampai proses selesai.' : 'Tarik dan lepas, atau klik untuk memilih dari perangkat.'}</span></div><span className="upload-prompt">{uploading ? <LoaderCircle className="spin" size={18}/> : 'PILIH BERKAS'}</span></section>}
      <section className="files-section"><div className="section-heading"><div><h2>{title}</h2><span>{activeFiles.length} berkas</span></div><button className="sort-button">Terbaru <ChevronDown size={15}/></button></div>
      {loadingFiles ? <div className="empty-state"><LoaderCircle className="spin" size={25}/><b>Mengumpulkan berkas Anda…</b></div> : activeFiles.length === 0 ? <div className="empty-state"><span className="empty-orb"><Cloud size={30}/></span><b>{query ? 'Berkas tidak ditemukan' : page === 'trash' ? 'Sampah Anda kosong' : page === 'starred' ? 'Belum ada favorit' : 'Ruang Anda masih kosong'}</b><p>{query ? 'Coba kata kunci lain.' : page === 'all' ? 'Unggah berkas pertama Anda, ruang ini siap menampungnya.' : 'Berkas yang sesuai akan muncul di sini.'}</p>{page === 'all' && <button className="secondary-button" onClick={() => inputRef.current?.click()}>Pilih berkas <ArrowDownToLine size={16}/></button>}</div> : view === 'list' ? <div className="file-table"><div className="file-table-head"><span>NAMA BERKAS</span><span>UKURAN</span><span>DITAMBAHKAN</span><span>AKSI</span></div>{activeFiles.map(file => <div className="file-row" key={file.id}><div className="file-name-cell"><FileGlyph file={file}/><div><b title={file.name}>{file.name}</b><span>{file.mime_type || 'Tipe tidak diketahui'}</span></div></div><span className="file-meta">{prettyBytes(Number(file.size_bytes))}</span><span className="file-meta">{dateLabel(file.created_at)}</span><div className="file-actions">{page === 'trash' ? <><button title="Pulihkan" onClick={() => void restoreFile(file)}><ArrowLeft size={17}/></button><button title="Hapus permanen" className="danger-action" onClick={() => void permanentlyDelete(file)}><X size={17}/></button></> : <><button title={file.is_favorite ? 'Hapus dari favorit' : 'Tambahkan ke favorit'} className={file.is_favorite ? 'favorite-active' : ''} onClick={() => void toggleFavorite(file)}><Star size={17} fill={file.is_favorite ? 'currentColor' : 'none'}/></button><button title="Unduh" onClick={() => void downloadFile(file)}><ArrowDownToLine size={17}/></button><button title="Pindahkan ke sampah" onClick={() => void moveToTrash(file)}><Trash2 size={17}/></button></>}</div></div>)}</div> : <div className="file-grid">{activeFiles.map(file => <article className="file-card" key={file.id}><div className="file-card-top"><FileGlyph file={file} large/><button aria-label="Aksi berkas" title="Aksi berkas" onClick={() => page === 'trash' ? void permanentlyDelete(file) : void toggleFavorite(file)}><MoreHorizontal size={20}/></button></div><b className="grid-filename" title={file.name}>{file.name}</b><span className="grid-file-meta">{prettyBytes(Number(file.size_bytes))} · {dateLabel(file.created_at)}</span><div className="grid-card-actions">{page === 'trash' ? <button onClick={() => void restoreFile(file)}><ArrowLeft size={16}/> Pulihkan</button> : <><button onClick={() => void downloadFile(file)}><ArrowDownToLine size={16}/> Unduh</button><button onClick={() => void moveToTrash(file)}><Trash2 size={16}/></button></>}</div></article>)}</div>}
      </section><footer className="content-footer"><span>RUANGAWAN <span className="dot">·</span> SIMPAN YANG BERARTI</span><span><ShieldCheck size={14}/> Ruang privat terenkripsi saat transit</span></footer>
      </div>
    </section>
  </main>;
}

function Brand() {
  return <div className="brand-lockup"><span className="brand-mark"><Cloud size={22} strokeWidth={2.2}/><i /></span><span className="brand-word">ruang<span>awan</span><small>YOUR PERSONAL CLOUD</small></span></div>;
}