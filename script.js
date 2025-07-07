let quranData = [];
let activeLanguages = { arabic: true, turkish: false };
let currentBookmark = null;
let currentSura = null;
let currentPage = 1;
const versesPerPage = 10;

function loadJSON() {
    fetch('quran_tr.json')
        .then(response => {
            if (!response.ok) throw new Error('HATA!');
            return response.json();
        })
        .then(data => {
            quranData = data;
            populateSuraSelect();
            loadBookmark();
            alert('JSON-File wurde automatisch geladen!');
        })
        .catch(error => {
            console.error("Fehler beim Laden der JSON:", error);
            alert('Fehler beim Laden der JSON-Datei.');
        });
}


function populateSuraSelect() {
    const select = document.getElementById('suraSelect');
    select.innerHTML = ''; // Önceki seçenekleri temizle
    quranData.forEach((sura, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `${index + 1}. ${sura.name} (${sura.transliteration})`;
        select.appendChild(option);
    });
    currentSura = 0;
    readQuran();
}

function readQuran() {
    currentSura = parseInt(document.getElementById('suraSelect').value);
    currentPage = 1;
    displayVerses();
}

function displayVerses() {
    const sura = quranData[currentSura];
    if (!sura) {
        console.error("Sura not found:", currentSura);
        return;
    }
    const startVerse = (currentPage - 1) * versesPerPage;
    const endVerse = Math.min(startVerse + versesPerPage, sura.verses.length);
    const verses = sura.verses.slice(startVerse, endVerse);

    let html = '';
    const quranContent = document.getElementById('quranContent');
    
    if (activeLanguages.arabic && activeLanguages.turkish) {
        quranContent.classList.add('dual-language');
        verses.forEach((verse, index) => {
            html += `<div class="verse ${currentBookmark && currentBookmark.suraId == currentSura && currentBookmark.verseNumber == startVerse + index + 1 ? 'bookmarked' : ''}">
                        <div class="arabic">
                            ${verse.text}<span class="verse-number">${startVerse + index + 1}</span>
                        </div>
                        <div class="turkish">
                            ${verse.translation}<span class="verse-number">${startVerse + index + 1}</span>
                        </div>
                     </div>`;
        });
    } else {
        quranContent.classList.remove('dual-language');
        verses.forEach((verse, index) => {
            if (activeLanguages.arabic) {
                html += `<span class="verse arabic ${currentBookmark && currentBookmark.suraId == currentSura && currentBookmark.verseNumber == startVerse + index + 1 ? 'bookmarked' : ''}">
                            ${verse.text}<span class="verse-number">${startVerse + index + 1}</span>
                         </span>`;
            } else if (activeLanguages.turkish) {
                html += `<span class="verse turkish ${currentBookmark && currentBookmark.suraId == currentSura && currentBookmark.verseNumber == startVerse + index + 1 ? 'bookmarked' : ''}">
                            ${verse.translation}<span class="verse-number">${startVerse + index + 1}</span>
                         </span>`;
            }
        });
    }
    quranContent.innerHTML = html;
}

function toggleLanguage(language) {
    activeLanguages[language] = !activeLanguages[language];
    const btn = document.getElementById(`toggle-${language}`);
    btn.classList.toggle('active');
    displayVerses();
}

function setBookmark() {
    const suraId = currentSura;
    const verseNumber = document.querySelector('.verse-number').textContent;
    currentBookmark = { suraId, verseNumber };
    localStorage.setItem('bookmark', JSON.stringify(currentBookmark));
    document.getElementById('bookmarkStatus').textContent = `Yer imi eklendi: Sure ${suraId + 1}, Ayet ${verseNumber}`;
    displayVerses();
}

function loadBookmark() {
    const bookmark = JSON.parse(localStorage.getItem('bookmark'));
    if (bookmark) {
        currentBookmark = bookmark;
        document.getElementById('suraSelect').value = bookmark.suraId;
        document.getElementById('bookmarkStatus').textContent = `Son yer imi: Sure ${parseInt(bookmark.suraId) + 1}, Ayet ${bookmark.verseNumber}`;
        currentSura = parseInt(bookmark.suraId);
        goToVerse(bookmark.verseNumber);
    }
}

function goToVerse(verseNumber = null) {
    if (!verseNumber) {
        verseNumber = parseInt(document.getElementById('verseInput').value);
    }
    if (verseNumber) {
        currentPage = Math.ceil(verseNumber / versesPerPage);
        displayVerses();
    }
}

function search() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    let results = [];

    quranData.forEach((sura, suraIndex) => {
        sura.verses.forEach((verse, verseIndex) => {
            if (verse.translation.toLowerCase().includes(query)) {
                results.push({
                    sura_id: suraIndex + 1,
                    verse_id: verseIndex + 1,
                    name: sura.name,
                    transliteration: sura.transliteration,
                    text: verse.text,
                    translation: verse.translation
                });
            }
        });
    });

    const { summary, topSurasHtml } = generateSummary(results, query);

    document.getElementById('searchSummary').innerHTML = summary;
    document.getElementById('topSuras').innerHTML = topSurasHtml;

    let html = '';
    results.forEach(result => {
        html += `<div class="search-result">
                    <div class="arabic">${result.text}</div>
                    <div class="turkish">${result.translation}</div>
                    <div class="verse-info">${result.name} (${result.transliteration}) Suresi, Ayet ${result.verse_id}</div>
                </div>`;
    });

    document.getElementById('searchResults').innerHTML = html;
}

function openTab(evt, tabName) {
    const tabContents = document.getElementsByClassName("tab-content");
    for (let i = 0; i < tabContents.length; i++) {
        tabContents[i].classList.remove("active");
    }
    const tabs = document.getElementsByClassName("tab");
    for (let i = 0; i < tabs.length; i++) {
        tabs[i].classList.remove("active");
    }
    document.getElementById(tabName).classList.add("active");
    evt.currentTarget.classList.add("active");
}

function changePage(direction) {
    const sura = quranData[currentSura];
    const totalPages = Math.ceil(sura.verses.length / versesPerPage);
    
    currentPage += direction;
    if (currentPage < 1) currentPage = 1;
    if (currentPage > totalPages) currentPage = totalPages;
    
    displayVerses();
}

// Yeni özet fonksiyonu
function generateSummary(results, query) {
    let summary = `'${query}' için ${results.length} sonuç bulundu. `;
    
    let suraCount = new Set(results.map(r => r.sura_id)).size;
    summary += `Bu sonuçlar ${suraCount} farklı surede bulundu.`;

    let topSuras = {};
    results.forEach(result => {
        if (topSuras[result.sura_id]) {
            topSuras[result.sura_id].count++;
        } else {
            topSuras[result.sura_id] = { 
                count: 1, 
                name: result.name, 
                transliteration: result.transliteration 
            };
        }
    });

    let sortedSuras = Object.entries(topSuras)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5);

    let topSurasHtml = "<h3>En çok geçtiği sureler:</h3><ul>";
    sortedSuras.forEach(([suraId, data]) => {
        topSurasHtml += `<li>${data.name} (${data.transliteration}) Suresi: ${data.count} kez</li>`;
    });
    topSurasHtml += "</ul>";

    return { summary, topSurasHtml };
}

window.onload = function() {
loadJSON();
document.getElementById('suraSelect').addEventListener('change', readQuran);
};


