"use client";

import { useEffect, useMemo, useState } from "react";

const starterTasks = [
  { id: 1, title: "Susun prioritas pekerjaan hari ini", time: "09.00", priority: "Tinggi", done: false },
  { id: 2, title: "Tinjau catatan dan ide penting", time: "11.30", priority: "Normal", done: false },
  { id: 3, title: "Siapkan rencana untuk besok", time: "16.00", priority: "Normal", done: true }
];

const quickPrompts = [
  { icon: "✦", title: "Atur hari saya", prompt: "Bantu saya menyusun rencana hari ini dengan prioritas, estimasi waktu, dan jeda istirahat." },
  { icon: "↗", title: "Pecahkan masalah", prompt: "Bantu saya menganalisis sebuah masalah, opsi solusi, risiko, lalu pilih langkah awal yang paling masuk akal." },
  { icon: "▤", title: "Buat daftar tugas", prompt: "Bantu pecah target besar saya menjadi daftar tugas kecil yang konkret dan berurutan." }
];

function Icon({ children }) { return <span className="icon" aria-hidden="true">{children}</span>; }

export default function Home() {
  const [tab, setTab] = useState("overview");
  const [tasks, setTasks] = useState(starterTasks);
  const [newTask, setNewTask] = useState("");
  const [note, setNote] = useState("Ide dan hal yang ingin saya ingat…");
  const [messages, setMessages] = useState([{ role: "assistant", content: "Halo! Saya Orbit, asisten kantor virtual Anda. Ceritakan hal yang ingin diselesaikan—saya akan membantu menyusun langkah yang jelas dan realistis." }]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    try {
      const savedTasks = localStorage.getItem("orbit-office-tasks-v1");
      const savedNote = localStorage.getItem("orbit-office-note-v1");
      const savedMessages = localStorage.getItem("orbit-office-chat-v1");
      if (savedTasks) setTasks(JSON.parse(savedTasks));
      if (savedNote !== null) setNote(savedNote);
      if (savedMessages) setMessages(JSON.parse(savedMessages));
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem("orbit-office-tasks-v1", JSON.stringify(tasks));
    localStorage.setItem("orbit-office-note-v1", note);
    localStorage.setItem("orbit-office-chat-v1", JSON.stringify(messages.slice(-40)));
  }, [tasks, note, messages, ready]);

  const today = new Date();
  const dateLabel = today.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const doneCount = tasks.filter((task) => task.done).length;
  const pendingCount = tasks.length - doneCount;
  const filteredTasks = tasks.filter((task) => task.title.toLowerCase().includes(search.toLowerCase()));

  function addTask(event) {
    event?.preventDefault();
    const title = newTask.trim();
    if (!title) return;
    setTasks((current) => [{ id: Date.now(), title, time: "Belum dijadwalkan", priority: "Normal", done: false }, ...current]);
    setNewTask("");
    setNotice("Tugas ditambahkan.");
    setTimeout(() => setNotice(""), 2200);
  }

  function toggleTask(id) {
    setTasks((current) => current.map((task) => task.id === id ? { ...task, done: !task.done } : task));
  }

  function removeTask(id) {
    setTasks((current) => current.filter((task) => task.id !== id));
  }

  async function sendMessage(event, override) {
    event?.preventDefault();
    const text = (override ?? message).trim();
    if (!text || busy) return;
    const nextMessages = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setMessage("");
    setTab("assistant");
    setBusy(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: nextMessages.slice(-13, -1).map(({ role, content }) => ({ role, content }))
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "AI belum dapat merespons.");
      setMessages((current) => [...current, { role: "assistant", content: data.answer }]);
    } catch (error) {
      setMessages((current) => [...current, { role: "assistant", content: "Saya belum dapat memproses permintaan ini. " + (error.message || "Periksa konfigurasi AI di server.") }]);
    } finally {
      setBusy(false);
    }
  }

  function choosePrompt(prompt) { sendMessage(null, prompt); }

  const greeting = today.getHours() < 11 ? "Selamat pagi" : today.getHours() < 15 ? "Selamat siang" : today.getHours() < 18 ? "Selamat sore" : "Selamat malam";

  const navItems = [
    { id: "overview", icon: "◈", label: "Ringkasan" },
    { id: "tasks", icon: "☷", label: "Daftar tugas", count: pendingCount },
    { id: "planner", icon: "▦", label: "Perencana" },
    { id: "notes", icon: "▤", label: "Catatan" },
    { id: "assistant", icon: "✦", label: "AI Assistant", active: true }
  ];

  return (
    <main className="app-shell">
      <aside className={"sidebar " + (tab === "menu" ? "mobile-open" : "")}>
        <a className="brand" href="#" onClick={(e) => { e.preventDefault(); setTab("overview"); }}>
          <span className="brand-mark"><span>◉</span></span>
          <span className="brand-text"><b>orbit<span>.</span></b><small>PERSONAL WORKSPACE</small></span>
        </a>
        <div className="workspace-switch">
          <div className="workspace-icon">O</div><div><b>My workspace</b><small>Personal office</small></div><span className="chevron">⌄</span>
        </div>
        <div className="nav-caption">WORKSPACE</div>
        <nav className="main-nav" aria-label="Navigasi utama">
          {navItems.map((item) => (
            <button key={item.id} className={"nav-item " + (tab === item.id ? "selected" : "")} onClick={() => setTab(item.id)}>
              <Icon>{item.icon}</Icon><span>{item.label}</span>{item.count > 0 && <small className="nav-count">{item.count}</small>}
              {item.active && <i className="nav-spark">✦</i>}
            </button>
          ))}
        </nav>
        <div className="nav-caption automation-cap">YOUR AI TOOLS</div>
        <button className="nav-item" onClick={() => { setTab("assistant"); setMessage("Bantu saya membuat rencana kerja otomatis untuk minggu ini."); }}><Icon>⤳</Icon><span>Workflow builder</span><span className="soon">SOON</span></button>
        <button className="nav-item" onClick={() => setNotice("Integrasi kalender akan tersedia setelah koneksi layanan dikonfigurasi.")}><Icon>◷</Icon><span>Integrasi</span><span className="soon">SOON</span></button>
        <div className="sidebar-bottom">
          <div className="plan-card"><div className="plan-orb">✦</div><b>Make room for focus</b><p>Let Orbit help you organize the busywork.</p><button onClick={() => setTab("assistant")}>Talk to Orbit <span>↗</span></button></div>
          <div className="profile-row"><div className="profile-avatar">T</div><div className="profile-text"><b>My profile</b><small>Personal account</small></div><button aria-label="Pengaturan" className="more-btn" onClick={() => setNotice("Pengaturan akun akan tersedia setelah autentikasi diaktifkan.")}>•••</button></div>
        </div>
      </aside>

      <section className="main-area">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setTab(tab === "menu" ? "overview" : "menu")} aria-label="Buka menu">☰</button>
          <div className="crumbs"><span>Workspace</span><b>/</b><strong>{navItems.find((i) => i.id === tab)?.label || "Ringkasan"}</strong></div>
          <div className="top-actions">
            <label className="search-box"><Icon>⌕</Icon><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari tugas..." aria-label="Cari tugas" /><kbd>⌘ K</kbd></label>
            <button className="top-icon" aria-label="Notifikasi" onClick={() => setNotice("Belum ada notifikasi baru.")}>♧<i /></button>
            <div className="top-avatar">T</div>
          </div>
        </header>

        <div className="page-content">
          {tab === "overview" && <>
            <section className="page-heading">
              <div><div className="eyebrow"><span className="pulse" /> YOUR PERSONAL SPACE</div><h1>{greeting}, <span>let’s make it count.</span></h1><p className="subheading">Ruang kerja Anda, satu tempat untuk berpikir jernih dan menyelesaikan lebih banyak hal.</p></div>
              <div className="date-pill"><span>▦</span>{dateLabel}</div>
            </section>

            <section className="hero-card">
              <div className="hero-grid" />
              <div className="hero-copy">
                <div className="hero-label"><span className="mini-star">✦</span> YOUR AI OFFICE ASSISTANT <span className="live-pill"><i /> READY TO HELP</span></div>
                <h2>A little more focus.<br /><em>A lot more done.</em></h2>
                <p>Delegasikan ide, rencana, dan masalah harian kepada Orbit. Mulai dari percakapan sederhana.</p>
                <button className="hero-button" onClick={() => setTab("assistant")}>Mulai percakapan <span>↗</span></button>
                <div className="hero-footnote"><span className="shield">◇</span> Anda tetap memegang kendali atas setiap tindakan.</div>
              </div>
              <div className="orb-stage" aria-label="Visualisasi 3D asisten AI">
                <div className="orb-halo halo-one" /><div className="orb-halo halo-two" /><div className="orb-halo halo-three" />
                <div className="orb-shadow" /><div className="orb-core"><div className="orb-gloss" /><div className="orb-sheen" /><div className="orb-star star-one">✦</div><div className="orb-star star-two">✧</div></div>
                <div className="orb-satellite sat-one"><span>✧</span></div><div className="orb-satellite sat-two"><span>✦</span></div>
                <div className="orb-label label-top"><span className="label-dot" /> ORBIT AI <small>PERSONAL AGENT</small></div>
                <div className="orb-label label-bottom"><span>✧</span> always learning your flow</div>
                <div className="orb-glint glint-one" /><div className="orb-glint glint-two" />
              </div>
              <div className="hero-corner">O / 01</div>
            </section>

            <section className="stat-grid">
              <article className="stat-card"><div className="stat-top"><span>OPEN TASKS</span><span className="stat-icon lilac">☷</span></div><div className="stat-value">{pendingCount}<small> tasks</small></div><div className="stat-bottom"><span className="tiny-green">↗ Stay on track</span><span>of {tasks.length} total</span></div><div className="mini-progress"><i style={{ width: (tasks.length ? doneCount / tasks.length * 100 : 0) + "%" }} /></div></article>
              <article className="stat-card"><div className="stat-top"><span>COMPLETED</span><span className="stat-icon mint">✓</span></div><div className="stat-value">{doneCount}<small> done</small></div><div className="stat-bottom"><span className="tiny-green">✦ Nice progress</span><span>{tasks.length ? Math.round(doneCount / tasks.length * 100) : 0}% completed</span></div><div className="mini-progress green"><i style={{ width: (tasks.length ? doneCount / tasks.length * 100 : 0) + "%" }} /></div></article>
              <article className="stat-card"><div className="stat-top"><span>FOCUS MODE</span><span className="stat-icon peach">◷</span></div><div className="stat-value">25<small> min</small></div><div className="stat-bottom"><span className="tiny-orange">Recommended session</span><button className="text-action" onClick={() => setNotice("Timer fokus akan dimulai pada versi berikutnya.")}>Start focus ↗</button></div><div className="focus-bars"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></article>
            </section>

            <section className="content-grid">
              <article className="panel tasks-panel">
                <div className="panel-header"><div><div className="section-kicker">STAY IN CONTROL</div><h3>Today's priorities <span className="count-bubble">{pendingCount}</span></h3></div><button className="link-button" onClick={() => setTab("tasks")}>Lihat semua <span>↗</span></button></div>
                <form className="add-task-form" onSubmit={addTask}><span className="add-plus">＋</span><input value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="Tambahkan tugas baru..." aria-label="Tugas baru" /><button type="submit">Add task</button></form>
                <div className="task-list">
                  {filteredTasks.slice(0, 5).map((task) => <div className={"task-row " + (task.done ? "is-done" : "")} key={task.id}><button className="task-check" aria-label={task.done ? "Tandai belum selesai" : "Selesaikan tugas"} onClick={() => toggleTask(task.id)}>{task.done ? "✓" : ""}</button><div className="task-info"><b>{task.title}</b><small><span>◷</span> {task.time}</small></div><span className={"priority " + (task.priority === "Tinggi" ? "high" : "normal")}>{task.priority}</span><button className="task-more" aria-label="Hapus tugas" onClick={() => removeTask(task.id)}>×</button></div>)}
                  {!filteredTasks.length && <div className="empty-state">Belum ada tugas yang cocok. Tambahkan tugas baru di atas.</div>}
                </div>
                <div className="panel-footer"><span><i className="tiny-pulse" /> {pendingCount} tasks left to conquer</span><button onClick={() => setTab("tasks")}>Manage tasks →</button></div>
              </article>
              <article className="panel flow-panel">
                <div className="panel-header"><div><div className="section-kicker">A GENTLE RHYTHM</div><h3>Your daily flow</h3></div><button className="panel-more" onClick={() => setTab("planner")}>•••</button></div>
                <div className="flow-date"><b>{today.toLocaleDateString("id-ID", { day:"numeric" })}</b><span>{today.toLocaleDateString("id-ID", { month:"long" })}</span><small>TODAY</small></div>
                <div className="timeline">
                  <div className="timeline-item"><div className="time">09:00</div><div className="time-dot violet" /><div className="timeline-detail"><b>Plan your day</b><small>Review priorities & goals</small><span className="event-tag lavender">PERSONAL</span></div></div>
                  <div className="timeline-item"><div className="time">11:30</div><div className="time-dot green-dot" /><div className="timeline-detail"><b>Deep work session</b><small>Make progress, distraction free</small><span className="event-tag mint-tag">FOCUS TIME</span></div></div>
                  <div className="timeline-item"><div className="time">16:00</div><div className="time-dot peach-dot" /><div className="timeline-detail"><b>Reflect & reset</b><small>Capture lessons for tomorrow</small><span className="event-tag peach-tag">WIND DOWN</span></div></div>
                </div>
                <button className="add-event" onClick={() => setTab("planner")}><span>＋</span> Open daily planner</button>
              </article>
            </section>

            <section className="quick-section"><div className="quick-heading"><div><div className="section-kicker">START WITH A LITTLE SPARK</div><h3>What can Orbit help with?</h3></div><span className="quick-sub">Choose a starting point</span></div><div className="quick-grid">{quickPrompts.map((item) => <button key={item.title} className="quick-card" onClick={() => choosePrompt(item.prompt)}><div className="quick-icon">{item.icon}</div><div><b>{item.title}</b><p>{item.title === "Atur hari saya" ? "Turn a busy day into a clear plan." : item.title === "Pecahkan masalah" ? "Think through your next best move." : "Break big goals into doable steps."}</p></div><span className="quick-arrow">↗</span></button>)}</div></section>
          </>}

          {tab === "tasks" && <section className="inner-page"><div className="page-heading"><div><div className="eyebrow"><span className="pulse" /> YOUR TASK BOARD</div><h1>Make progress, <span>one task at a time.</span></h1><p className="subheading">Tulis pekerjaan, tandai selesai, dan rapikan daftar Anda.</p></div><div className="date-pill">☷ {pendingCount} belum selesai</div></div><article className="panel full-panel"><div className="panel-header"><div><div className="section-kicker">TASK MANAGEMENT</div><h3>Semua tugas</h3></div><span className="count-bubble">{tasks.length}</span></div><form className="add-task-form" onSubmit={addTask}><span className="add-plus">＋</span><input value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="Apa yang perlu diselesaikan?" aria-label="Tugas baru" /><button type="submit">Tambah tugas</button></form><div className="task-list">{filteredTasks.map((task) => <div className={"task-row " + (task.done ? "is-done" : "")} key={task.id}><button className="task-check" onClick={() => toggleTask(task.id)}>{task.done ? "✓" : ""}</button><div className="task-info"><b>{task.title}</b><small>◷ {task.time}</small></div><span className={"priority " + (task.priority === "Tinggi" ? "high" : "normal")}>{task.priority}</span><button className="task-more" onClick={() => removeTask(task.id)} aria-label="Hapus tugas">×</button></div>)}{!filteredTasks.length && <div className="empty-state">Tidak ada tugas. Tambahkan tugas baru di atas.</div>}</div></article></section>}

          {tab === "planner" && <section className="inner-page"><div className="page-heading"><div><div className="eyebrow"><span className="pulse" /> YOUR DAY, WITH INTENTION</div><h1>Design a day that <span>works for you.</span></h1><p className="subheading">{dateLabel}. Atur ritme, bukan hanya daftar pekerjaan.</p></div></div><div className="planner-grid"><article className="panel full-panel"><div className="panel-header"><div><div className="section-kicker">DAILY FLOW</div><h3>Rencana hari ini</h3></div><span className="date-pill">Today</span></div><div className="planner-block"><div className="planner-time">09:00 <small>25 min</small></div><div className="planner-color purple" /><div><b>Mulai dengan prioritas</b><p>Pilih satu tugas penting dan tentukan hasil yang ingin dicapai.</p></div></div><div className="planner-block"><div className="planner-time">11:30 <small>50 min</small></div><div className="planner-color mint-bg" /><div><b>Sesi fokus</b><p>Kerjakan satu hal tanpa gangguan, lalu istirahat sejenak.</p></div></div><div className="planner-block"><div className="planner-time">14:00 <small>30 min</small></div><div className="planner-color orange-bg" /><div><b>Urus hal-hal kecil</b><p>Balas pesan, rapikan catatan, dan selesaikan tugas singkat.</p></div></div><div className="planner-block"><div className="planner-time">16:00 <small>15 min</small></div><div className="planner-color blue-bg" /><div><b>Refleksi dan reset</b><p>Catat progres dan tentukan langkah pertama untuk besok.</p></div></div><button className="planner-ai" onClick={() => choosePrompt("Buatkan rencana hari ini yang realistis. Tanyakan tiga hal singkat yang perlu Anda ketahui tentang prioritas dan jadwal saya.")}>✦ Minta Orbit mempersonalisasi rencana <span>↗</span></button></article><aside className="panel planner-side"><div className="section-kicker">A QUICK REMINDER</div><h3>Progress over perfection.</h3><p>Anda tidak harus menyelesaikan semuanya hari ini. Mulai dari tugas yang membuat hal lain menjadi lebih mudah.</p><div className="reminder-orb">✦</div><div className="section-kicker">TODAY’S CHECKLIST</div><div className="check-stat"><span>Tasks completed</span><b>{doneCount}/{tasks.length}</b></div><div className="mini-progress green"><i style={{ width: (tasks.length ? doneCount / tasks.length * 100 : 0) + "%" }} /></div><button className="link-button" onClick={() => setTab("tasks")}>Open task board ↗</button></aside></div></section>}

          {tab === "notes" && <section className="inner-page"><div className="page-heading"><div><div className="eyebrow"><span className="pulse" /> YOUR SECOND BRAIN</div><h1>Keep the good ideas <span>close.</span></h1><p className="subheading">Simpan gagasan, potongan pikiran, atau hal yang ingin Anda tindak lanjuti.</p></div><div className="date-pill">▤ Quick notes</div></div><article className="panel notes-panel"><div className="panel-header"><div><div className="section-kicker">QUICK CAPTURE</div><h3>Catatan pribadi</h3></div><span className="note-status">{ready ? "● Tersimpan di perangkat ini" : "Memuat..."}</span></div><textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Tulis ide, hal penting, atau rencana Anda di sini..." aria-label="Catatan pribadi" /><div className="notes-footer"><span>✦ Catatan tersimpan otomatis di browser ini.</span><button className="link-button" onClick={() => choosePrompt("Bantu saya merapikan dan mengubah catatan berikut menjadi poin tindakan yang jelas:\n\n" + note)}>Ubah jadi rencana aksi ↗</button></div></article><div className="privacy-note"><span>◇</span><div><b>Privasi Anda</b><p>Catatan saat ini tersimpan di browser perangkat ini, belum tersinkron ke cloud atau akun lain.</p></div></div></section>}

          {tab === "assistant" && <section className="inner-page assistant-page"><div className="page-heading"><div><div className="eyebrow"><span className="pulse" /> YOUR PERSONAL AI</div><h1>Let's work through it <span>together.</span></h1><p className="subheading">Jelaskan apa yang ada di pikiran Anda. Kita ubah menjadi langkah yang bisa dikerjakan.</p></div><div className="ai-status"><span className="status-orb">✦</span><div><b>Orbit Assistant</b><small><i /> API connection ready to configure</small></div></div></div><div className="chat-layout"><article className="panel chat-panel"><div className="chat-header"><div className="chat-avatar">✦</div><div><b>Orbit <span className="verified">✓</span></b><small>Your personal thinking partner</small></div><span className="chat-safe">◇ Private workspace</span></div><div className="chat-messages">{messages.map((item, index) => <div key={index} className={"message-row " + item.role}><div className="message-avatar">{item.role === "assistant" ? "✦" : "T"}</div><div className="message-content"><small>{item.role === "assistant" ? "ORBIT" : "YOU"}</small><p>{item.content}</p></div></div>)}{busy && <div className="message-row assistant"><div className="message-avatar">✦</div><div className="message-content"><small>ORBIT</small><p className="typing"><i/><i/><i/> Sedang menyusun respons…</p></div></div>}</div><form className="chat-composer" onSubmit={(e) => sendMessage(e)}><textarea rows="2" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Ceritakan masalah, ide, atau hal yang ingin diselesaikan..." aria-label="Pesan untuk Orbit" onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(e); } }} /><div className="composer-bottom"><span>↵ Enter untuk kirim · Shift + Enter untuk baris baru</span><button type="submit" disabled={busy || !message.trim()} aria-label="Kirim pesan">Kirim <span>↗</span></button></div></form></article><aside className="panel prompt-panel"><div className="section-kicker">NEED A PLACE TO START?</div><h3>Bring a little clarity.</h3><p>Pilih prompt untuk memulai sesi berpikir bersama Orbit.</p>{quickPrompts.map((item) => <button className="prompt-option" key={item.title} onClick={() => choosePrompt(item.prompt)}><span>{item.icon}</span><div><b>{item.title}</b><small>{item.title === "Atur hari saya" ? "Planning & prioritization" : item.title === "Pecahkan masalah" ? "Explore options & risks" : "Turn goals into actions"}</small></div><i>↗</i></button>)}<div className="privacy-note compact"><span>◇</span><div><b>Deliberate by design</b><p>Orbit tidak akan mengaku melakukan tindakan eksternal yang belum benar-benar dijalankan.</p></div></div></aside></div></section>}

          {notice && <div className="toast" role="status"><span>✓</span>{notice}<button onClick={() => setNotice("")}>×</button></div>}
          <footer className="page-footer"><span>© {today.getFullYear()} Orbit Office</span><span><i className="footer-dot" /> Your space. Your pace.</span><button onClick={() => setNotice("Orbit Office saat ini adalah prototipe yang sedang disiapkan.")}>About this workspace</button></footer>
        </div>
      </section>
    </main>
  );
}
