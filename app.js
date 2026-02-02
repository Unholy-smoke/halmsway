let data = null;
let currentIndex = 0;

async function init() {
    const res = await fetch('strips.json');
    data = await res.json();

    document.querySelector('#site-subtitle a').textContent = data.subtitle;

    // Resolve starting strip from URL hash
    const hash = location.hash.replace('#', '');
    if (hash) {
        const idx = data.strips.findIndex(s => s.id === hash);
        if (idx >= 0) currentIndex = idx;
    }

    buildIndex();
    render();

    window.addEventListener('hashchange', () => {
        const id = location.hash.replace('#', '');
        const idx = data.strips.findIndex(s => s.id === id);
        if (idx >= 0 && idx !== currentIndex) {
            currentIndex = idx;
            render();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        if (e.key === 'ArrowLeft') navigate(-1);
        if (e.key === 'ArrowRight') navigate(1);
    });
}

function navigate(dir) {
    const next = currentIndex + dir;
    if (next < 0 || next >= data.strips.length) return;
    currentIndex = next;
    location.hash = data.strips[currentIndex].id;
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function render() {
    const strip = data.strips[currentIndex];
    const total = data.strips.length;

    // Image
    const img = document.getElementById('strip-image');
    img.src = strip.file;
    img.alt = strip.title;

    // Info
    document.getElementById('strip-episode').textContent =
        strip.episode + (strip.episode_title ? ' \u00b7 ' + strip.episode_title : '');
    document.getElementById('strip-title').textContent = strip.title;

    // Counters
    const counter = `${currentIndex + 1} / ${total}`;
    document.getElementById('strip-counter').textContent = counter;
    document.getElementById('footer-counter').textContent = counter;

    // Nav button states
    document.querySelectorAll('.nav-btn').forEach(btn => {
        const text = btn.textContent;
        if (text.includes('Prev')) btn.disabled = currentIndex === 0;
        if (text.includes('Next')) btn.disabled = currentIndex === total - 1;
    });

    // Active state in index
    document.querySelectorAll('.index-strip-link').forEach(el => {
        el.classList.toggle('active', el.dataset.id === strip.id);
    });

    // Notes
    loadNotes(strip);
}

async function loadNotes(strip) {
    const section = document.getElementById('notes-section');
    const content = document.getElementById('notes-content');

    if (!strip.notes) {
        section.classList.remove('has-notes');
        return;
    }

    try {
        const res = await fetch(strip.notes);
        if (!res.ok) throw new Error();
        const md = await res.text();
        const trimmed = md.trim();
        if (!trimmed) {
            section.classList.remove('has-notes');
            return;
        }
        content.innerHTML = renderMarkdown(trimmed);
        section.classList.add('has-notes');
    } catch {
        section.classList.remove('has-notes');
    }
}

function renderMarkdown(text) {
    // Simple markdown: paragraphs, bold, italic
    return text
        .split(/\n\n+/)
        .map(para => {
            let html = escapeHtml(para.trim())
                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.+?)\*/g, '<em>$1</em>')
                .replace(/\n/g, '<br>');
            return '<p>' + html + '</p>';
        })
        .join('\n');
}

function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildIndex() {
    // Group strips by episode
    const episodes = [];
    const episodeMap = {};

    for (const strip of data.strips) {
        if (!episodeMap[strip.episode]) {
            const ep = {
                id: strip.episode,
                title: strip.episode_title || strip.episode,
                strips: []
            };
            episodes.push(ep);
            episodeMap[strip.episode] = ep;
        }
        episodeMap[strip.episode].strips.push(strip);
    }

    const container = document.getElementById('index-content');
    container.innerHTML = episodes.map(ep => {
        const stripLinks = ep.strips.map(s =>
            `<a class="index-strip-link" data-id="${s.id}" href="#${s.id}">${s.title}</a>`
        ).join('');

        return `<div class="index-episode">
            <div class="index-episode-title">${ep.id} &mdash; ${ep.title} (${ep.strips.length})</div>
            ${stripLinks}
        </div>`;
    }).join('');
}

init();
