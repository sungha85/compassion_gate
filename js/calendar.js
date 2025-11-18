//calendar.js
/* ===================== Firestore 연동 + 3-그룹 탭 달력 ===================== */

// 헬퍼
const $ = (s)=>document.querySelector(s);
const KST = new Intl.DateTimeFormat('ko-KR',{ timeZone:'Asia/Seoul', dateStyle:'medium' });
const fmtRange = (s,e)=> `${KST.format(s)} ~ ${KST.format(e)}`;
const parseDate = (s)=>{ const [y,m,d] = (s||'').split('-').map(Number); return new Date(y, m-1, d); };
const monthNames = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];

// 메인 그룹과 레인 (지금은 필터/매핑용으로만 사용, 레인 그리드는 LANES 사용)
const GROUPS = {
  "Enterprise Calendar": ["ELT Meetings","GMC","Cross Funtional PJT","전략","재경","인사","컴플라이언스","IT"],
  "주요사역": ["온라인","행사","콘텐츠","VT"],
  "신청": ["CS","전사교육","마감"]
};
const LANE_TO_GROUP = {
  "ELT Meetings":"Enterprise Calendar","GMC":"Enterprise Calendar","Cross Funtional PJT":"Enterprise Calendar","전략":"Enterprise Calendar","재경":"Enterprise Calendar","인사":"Enterprise Calendar","컴플라이언스":"Enterprise Calendar","IT":"Enterprise Calendar",
  "온라인":"주요사역","행사":"주요사역","콘텐츠":"주요사역","VT":"주요사역",
  "CS":"신청","전사교육":"신청","마감":"신청"
};
let activeGroup = "주요사역"; // ← 기본 시작 그룹

// 레인은 항상 이 목록 전체를 보여줌
const LANES = ["대표실","컴플","전략","재경","P&C","미션","교파","교미","비전","무브","디이","마캠","브컴","크리","특후","IT","SE","SR"];
const CATEGORIES = ["행사","업무","신청"];

const headerEl = $("#grid-header");
const rowsEl = $("#lane-rows");
const linesEl = $("#grid-lines");
const layerEl = $("#bar-layer");
const todayEl = $("#today-line");

// 뷰 상태
const today = new Date();
let viewYear  = today.getFullYear();
let viewMonth = today.getMonth()+1; // 1..12
let annual = false;

// 연/월 컨트롤
(function initYMControls(){
  const ysel = $("#year-select");
  const startY = today.getFullYear()-2, endY = today.getFullYear()+1;
  for(let y=startY;y<=endY;y++){
    const opt = document.createElement('option');
    opt.value = y; opt.textContent = y+'년';
    if(y===viewYear) opt.selected = true;
    ysel.appendChild(opt);
  }
  ysel.addEventListener('change', ()=>{
    viewYear = Number(ysel.value);
    buildGrid();
    refresh();
    updateMobileMonthLabel();          // ★ 연도 바뀌면 모바일 라벨도 갱신
  });

  const mwrap = $("#month-buttons");
  monthNames.forEach((name,idx)=>{
    const m = idx+1;
    const b = document.createElement('button');
    b.textContent = name;
    b.setAttribute('role','tab');
    b.setAttribute('aria-pressed', String(viewMonth===m));
    b.addEventListener('click', ()=>{
      viewMonth = m;
      [...mwrap.children].forEach(x=>x.setAttribute('aria-pressed','false'));
      b.setAttribute('aria-pressed','true');
      if(!annual){
        buildGrid();
        refresh();
      } else {
        refresh();
      }
      updateMobileMonthLabel();        // ★ 월 버튼 눌렀을 때도 갱신
    });
    mwrap.appendChild(b);
  });

  $("#prev-month").addEventListener('click', ()=>{
    if(viewMonth===1){ viewMonth=12; viewYear--; } else viewMonth--;
    ysel.value = String(viewYear);
    mwrap.children[viewMonth-1].click(); // 여기서 click 핸들러 안에서 updateMobileMonthLabel 호출됨
  });
  $("#next-month").addEventListener('click', ()=>{
    if(viewMonth===12){ viewMonth=1; viewYear++; } else viewMonth++;
    ysel.value = String(viewYear);
    mwrap.children[viewMonth-1].click();
  });

  const tgl = $("#toggle-annual");
  tgl.checked = annual;
  tgl.addEventListener('change', ()=>{
    annual = tgl.checked;
    buildGrid();
    refresh();
    updateMobileMonthLabel();          // 연간/단월 토글해도 표시 유지
  });

  // ★ 초기 진입 시 한 번 세팅
  updateMobileMonthLabel();
})();


// 그리드 구성(연간/단월)
function buildGrid(){
  headerEl.innerHTML = '';
  rowsEl.innerHTML = '';
  linesEl.innerHTML = '';
  layerEl.innerHTML = '';

  if(annual){
    headerEl.style.gridTemplateColumns = `var(--left-col) repeat(12,1fr)`;
    rowsEl.style.gridTemplateColumns   = `var(--left-col) repeat(12,1fr)`;
    linesEl.style.inset = `var(--header-h) 0 0 var(--left-col)`;
    linesEl.style.display = 'grid';
    linesEl.style.gridTemplateColumns = `repeat(12,1fr)`;

    const empty = document.createElement('div');
    empty.style.borderRight = '1px solid var(--grid)';
    headerEl.appendChild(empty);
    for(let i=0;i<12;i++){
      const m = document.createElement('div');
      m.textContent = monthNames[i];
      headerEl.appendChild(m);
      const gl = document.createElement('div');
      linesEl.appendChild(gl);
    }
  }else{
    headerEl.style.gridTemplateColumns = `var(--left-col) 1fr`;
    rowsEl.style.gridTemplateColumns   = `var(--left-col) 1fr`;
    linesEl.style.inset = `var(--header-h) 0 0 var(--left-col)`;
    linesEl.style.display = 'grid';
    linesEl.style.gridTemplateColumns = `1fr`;

    const empty = document.createElement('div');
    empty.style.borderRight = '1px solid var(--grid)';
    headerEl.appendChild(empty);
    const m = document.createElement('div');
    m.textContent = `${viewYear}년 ${monthNames[viewMonth-1]}`;
    headerEl.appendChild(m);
    const gl = document.createElement('div');
    linesEl.appendChild(gl);
  }

  // 레인 행: ★ 항상 LANES 전체를 사용
  LANES.forEach(name=>{
    const row = document.createElement('div');
    row.className = 'row';
    row.style.gridTemplateColumns = annual ? `var(--left-col) repeat(12,1fr)` : `var(--left-col) 1fr`;
    const lane = document.createElement('div');
    lane.className = 'lane-name';
    lane.textContent = name;
    row.appendChild(lane);
    const colCount = annual ? 12 : 1;
    for(let i=0;i<colCount;i++){
      const cell = document.createElement('div');
      cell.className = 'cell';
      row.appendChild(cell);
    }
    rowsEl.appendChild(row);
  });

  // 오늘 라인 (연간만)
  if(annual){
    const now = new Date();
    if(now.getFullYear()===viewYear){
      const month = now.getMonth();
      const day = now.getDate();
      const dim = new Date(now.getFullYear(), month+1, 0).getDate();
      const frac = month + (day-1)/dim;
      const leftPct = (frac/12)*100;
      todayEl.style.left = `calc(${leftPct}% + var(--left-col))`;
      todayEl.style.display = 'block';
    }else{
      todayEl.style.display = 'none';
    }
    todayEl.style.top = 'var(--header-h)';
    todayEl.style.bottom = '0';
  }else{
    todayEl.style.display = 'none';
  }

  layerEl.style.inset = `var(--header-h) 0 0 var(--left-col)`;
}

// 탭 토글
const groupTabs = $("#group-tabs");
if (groupTabs){
  groupTabs.addEventListener("click",(e)=>{
    const btn = e.target.closest("button[data-group]");
    if(!btn) return;
    const g = btn.getAttribute("data-group");
    if(g===activeGroup) return;
    activeGroup = g;
    [...groupTabs.querySelectorAll("button")].forEach(b=>{
      b.setAttribute('aria-pressed', String(b===btn));
    });
    buildGrid();   // 레이아웃 다시 구성 (레인은 그대로지만 header/lines 초기화)
    refresh();     // 이벤트 바 다시 그리기
  });
}

// 바 렌더
const layer = $("#bar-layer");
const todayLine = $("#today-line");
function monthIndex(d){ return d.getMonth(); }
function monthSpan(s,e){
  const months=(e.getFullYear()-s.getFullYear())*12+(e.getMonth()-s.getMonth())+1;
  return Math.max(1,months);
}

// ★ laneY도 항상 LANES 기준으로 Y 좌표 계산
function laneY(name){
  const lanes = LANES;
  const idx = lanes.indexOf(name);
  const header = 34;
  const laneH  = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--lane-h'));
  const gap    = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--lane-gap'));
  return header + Math.max(0,idx)*(laneH+gap);
}

function renderTodayLine(){
  const now=new Date(), m=now.getMonth(), d=now.getDate();
  const dim=new Date(now.getFullYear(),m+1,0).getDate();
  const frac=m+(d-1)/dim; const leftPct=(frac/12)*100;
  if(todayLine) todayLine.style.left=`calc(${leftPct}% + var(--left-col))`;
}

let EVENTS = []; // Firestore에서 동기화

// 그룹 추론 함수는 남겨두지만, 기본은 category 사용
function inferGroupByLane(lane){ return LANE_TO_GROUP[lane] || "Enterprise Calendar"; }

// ★ 현재 탭(activeGroup)과 LANES에 포함된 레인만 필터링
function filtered(list){
  return list.filter(ev=>{
    if(!ev.lane || !LANES.includes(ev.lane)) return false;
    // Firestore 데이터에서 group이 비어 있으면 category를 사용
    const g = ev.group || ev.category || inferGroupByLane(ev.lane||"");
    return g === activeGroup;
  });
}

// 헬퍼: 해당 월과 겹치는가?
function intersectsMonth(ev, y, m){
  if(!ev.start || !ev.end) return false;
  const s = parseDate(ev.start), e = parseDate(ev.end);
  const first = new Date(y, m-1, 1);
  const last  = new Date(y, m, 0);
  return s <= last && e >= first;
}

function renderBars(){
  layerEl.innerHTML = '';

  // 1차: 연간/월간 범위 필터
  const base = annual
    ? EVENTS
    : EVENTS.filter(ev => intersectsMonth(ev, viewYear, viewMonth));

  // 2차: 현재 탭(activeGroup) + 레인(LANES) 필터
  const list = filtered(base);

  console.log('[renderBars] events:', JSON.stringify(list));

  list.forEach(ev=>{
    if(!ev.lane || LANES.indexOf(ev.lane)<0) return;

    let leftPct = 0, widthPct = 100;
    if(annual){
      const s = parseDate(ev.start||`${viewYear}-01-01`);
      const startIdx = Math.min(11, Math.max(0, s.getMonth()));
      leftPct = (startIdx/12)*100;
      const e = parseDate(ev.end||`${viewYear}-12-31`);
      const months = (e.getFullYear()-s.getFullYear())*12 + (e.getMonth()-s.getMonth()) + 1;
      widthPct = Math.max(1, Math.min(12, months)) / 12 * 100;
    }else{
      leftPct = 0; widthPct = 100; // 단월: 한 칸
    }

    const bar = document.createElement('div');
    bar.className = `event t-${ev.lane}`;
    bar.style.left = `calc(${leftPct}% + 6px)`;
    bar.style.top  = `${laneY(ev.lane) - 20}px`;
    bar.style.width= `calc(${widthPct}% - 12px)`;
    bar.tabIndex = 0;
    bar.setAttribute('role','button');
    bar.setAttribute('aria-label', `${ev.lane} · ${ev.title} · ${ev.start} ~ ${ev.end} · ${ev.category}`);
    bar.textContent = ev.title || '(제목 없음)';
    bar.addEventListener('click', ()=>openModal(ev));
    bar.addEventListener('keydown', (e)=>{ if(e.key==='Enter' || e.key===' ') { e.preventDefault(); openModal(ev); } });
    layerEl.appendChild(bar);
  });
}

function refresh(){ renderBars(); }
window.addEventListener('resize', refresh);

// 모달
function openModal(ev){
  $("#m-title").textContent = ev.title || '(제목 없음)';
  const s=parseDate(ev.start), e=parseDate(ev.end);
  $("#m-when").textContent = (ev.start&&ev.end)?`일정: ${fmtRange(s,e)}`:'';
  $("#m-dept").textContent = `레인: ${ev.lane||''} · 카테고리: ${ev.category||''}`;
  $("#m-note").textContent = ev.note?`메모: ${ev.note}`:'';
  const modal=$("#modal");
  modal.style.display='flex'; modal.setAttribute('aria-hidden','false');
  document.body.style.overflow='hidden'; $("#closeBtn").focus();
}
function closeModal(){
  const m=$("#modal");
  m.style.display='none';
  m.setAttribute('aria-hidden','true');
  document.body.style.overflow='';
}
$("#modal")?.addEventListener('click',e=>{ if(e.target.id==='modal') closeModal(); });
document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeModal(); });
$("#closeBtn")?.addEventListener('click',closeModal);

// Firebase (v10 CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBsTMadItNXG9YqmtFYr9bX6lbt0qIh9FQ",
  authDomain: "dcp-page.firebaseapp.com",
  projectId: "dcp-page",
  storageBucket: "dcp-page.firebasestorage.app",
  messagingSenderId: "1056273445903",
  appId: "1:1056273445903:web:9e924f9bd476a860af1f7a",
  measurementId: "G-CZS1G9M1KQ"
};
const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// Firestore 구독 → EVENTS 반영 → 렌더
const q = query(collection(db,'events'), orderBy('createdAt','desc'));
onSnapshot(q, (snap)=>{
  const list=[];
  snap.forEach(doc=>{
    const d=doc.data();
    list.push({
      id: doc.id,
      title: d.title||'',
      start: d.start||'',
      end  : d.end||'',
      lane : d.lane||'',
      category: d.category||'',
      group: d.group||'', // 있으면 사용
      note : d.note||''
    });
  });
  // 시작일 기준 오름차순으로 보이도록 정렬
  list.sort((a,b)=> (a.start||'').localeCompare(b.start||''));
  EVENTS=list;
  refresh();
}, (err)=>console.error('onSnapshot error:',err));

// Compact 토글
$("#btn-compact")?.addEventListener('click', ()=>{
  const on = document.body.classList.toggle('compact');
  $("#btn-compact").setAttribute('aria-pressed', String(on));
  refresh();
});

// 이미지 썸네일 모달
let imageAvailable=false;
window.calendarImageReady=()=>{ imageAvailable=true; };
window.calendarImageMissing=()=>{ imageAvailable=false; document.querySelector('.imgbox')?.remove(); };
window.openImage=()=>{
  if(!imageAvailable) return;
  $("#m-title").textContent='전사일정&행사 (이미지)';
  $("#m-when").innerHTML='<img src="enterprise-calendar.png" style="width:100%;border:1px solid #e5e7eb;border-radius:8px" alt="calendar" />';
  $("#m-dept").textContent='';
  $("#m-note").textContent='';
  const modal = $("#modal");
  modal.style.display='flex';
  modal.setAttribute('aria-hidden','false');
  document.body.style.overflow='hidden';
  $("#closeBtn").focus();
};

window.addEventListener('resize', refresh);

function updateMobileMonthLabel(){
  const label = document.getElementById('mobile-month-label');
  if (!label) return;
  label.textContent = `${viewYear}년 ${monthNames[viewMonth-1]}`;
}


// 최초 빌드/렌더
buildGrid();
refresh();


