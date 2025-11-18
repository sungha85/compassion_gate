// 상단 빠른 바로가기: 6칸 고정 + 더보기
const MOBILE_BP = 768;
const isMobile = () => window.matchMedia(`(max-width:${MOBILE_BP}px)`).matches;

function updateFolderLabelA11y() {
  document.querySelectorAll('#quick-grid .folder-label').forEach(label => {
    if (isMobile()) {
      label.setAttribute('role', 'button');
      label.setAttribute('tabindex', '0');
    } else {
      label.removeAttribute('role');
      label.removeAttribute('tabindex');
    }
  });
}

// 처음 로드 시 1회 실행 + 리사이즈마다 갱신
updateFolderLabelA11y();
window.addEventListener('resize', updateFolderLabelA11y);


(function setupSixSlots(){
  const MAX_VISIBLE = 5;   // 기본으로 보여줄 앱 개수
  const TOTAL_SLOTS  = 6;  // 항상 6칸(3x2)

  document.querySelectorAll('#quick-grid > section .apps').forEach(appsEl=>{
    // 1) 이 폴더 안의 앱만 뽑아두고, 컨테이너는 싹 비운다
    const apps = [...appsEl.querySelectorAll('.app')];
    const total = apps.length;

    // 컨테이너 정리: 기존 children 다 제거(옛날 span, slot-empty 등 포함)
    appsEl.innerHTML = '';

    // 앱이 5개 이하인 경우: 더보기 없이 모두 노출
    if (total <= MAX_VISIBLE) {
      // 앱 전부 다시 붙이기
      apps.forEach(a=>{
        a.style.display = '';     // 보이게
        appsEl.appendChild(a);
      });
      // 6칸 맞춰서 빈 슬롯 채우기
      for (let i = total; i < TOTAL_SLOTS; i++) {
        const ph = document.createElement('span');
        ph.className = 'slot-empty';
        appsEl.appendChild(ph);
      }
      return;
    }

    // 앱이 5개 초과인 경우: 앞 5개만 노출 + 6번째에 더보기
    const visible = apps.slice(0, MAX_VISIBLE);
    const hidden  = apps.slice(MAX_VISIBLE);

    // 1~5번 앱
    visible.forEach(a=>{
      a.style.display = '';
      appsEl.appendChild(a);
    });

    // 6번째: 더보기 타일
    const more = document.createElement('button');
    more.type = 'button';
    more.className = 'app more-tile';
    more.setAttribute('aria-haspopup', 'dialog');

    const badge = document.createElement('div');
    badge.className = 'badge c-gray';
    badge.textContent = `+${hidden.length}`;  // 숨겨진 개수
    const label = document.createElement('div');
    label.className = 'label';
    label.textContent = '더보기';

    more.appendChild(badge);
    more.appendChild(label);
    appsEl.appendChild(more);      // ✅ 항상 6번째 칸

    // 숨겨진 앱들은 display:none 으로 뒤에 붙여둔다 (레이아웃엔 안 보이지만 모달에서 사용)
    hidden.forEach(a=>{
      a.style.display = 'none';
      appsEl.appendChild(a);
    });
  });
})();

/* ===================== 더보기 모달 (위임) ===================== */
/* ===================== 더보기 모달 (위임) ===================== */
(function moreModalDelegation(){
  const quickGrid = document.getElementById('quick-grid');
  const modal  = document.getElementById('more-modal');
  const box    = document.getElementById('more-grid');
  const title  = document.getElementById('more-title');
  const closeB = document.getElementById('more-close');

  // 모달 관련 DOM 체크 (없으면 기능 전체 skip)
  if (!quickGrid || !modal || !box || !title || !closeB) {
    console.warn('[moreModalDelegation] required elements not found, skipping more-modal feature');
    return;
  }

  function openFor(appsEl){
    const apps = [...appsEl.querySelectorAll('.app')]; // 모든 앱(숨긴 것도 포함)
    const groupLabel =
      appsEl.closest('section')?.querySelector('.folder-label span')?.textContent?.trim()
      || '앱 목록';

    title.textContent = groupLabel;

    box.innerHTML = '';
    apps.forEach(a=>{
      const card = document.createElement('a');
      card.className = 'more-app';
      card.href = a.href || '#';
      card.target = a.target || '_blank';
      if(a.rel) card.rel = a.rel;
      const b = a.querySelector('.badge')?.cloneNode(true);
      const l = a.querySelector('.label')?.cloneNode(true);
      if(b) card.appendChild(b);
      if(l) card.appendChild(l);
      box.appendChild(card);
    });

    // ★ 여기서 실제로 보이도록
    modal.style.display = 'flex';          // ← 추가
    modal.setAttribute('aria-hidden','false');
    document.body.style.overflow='hidden';
    closeB.focus();
  }

  const close = ()=>{
    modal.style.display = 'none';          // ← 추가
    modal.setAttribute('aria-hidden','true');
    document.body.style.overflow='';
  };

   quickGrid.addEventListener('click', e=>{
    // 1) 기존: 더보기 타일 클릭 시
    const btn = e.target.closest('.more-tile');
    if(btn) {
      const appsEl = btn.closest('.apps');
      if(appsEl) openFor(appsEl);
      return;
    }

    // 2) 모바일: 폴더 라벨을 눌렀을 때, 해당 섹션의 앱들을 모달에 표시
    if (isMobile()) {
      const label = e.target.closest('.folder-label');
      if (label) {
        const section = label.closest('section');
        const appsEl = section && section.querySelector('.apps');
        if (appsEl) openFor(appsEl);
      }
    }
  });

  closeB.addEventListener('click', close);
  modal.addEventListener('click', e=>{ if(e.target.id === 'more-modal') close(); });
  document.addEventListener('keydown', e=>{
    if(modal.getAttribute('aria-hidden')==='false' && e.key==='Escape') close();
  });
})();


/* ===================== 앱 툴팁 자동 적용 ===================== */
(function applyAppTooltips(){
  // 1) 키 = data-key, 값 = 툴팁 텍스트 (원하는 대로 수정/보강하면 됨)
  const TOOLTIP_MAP = {
    // 현황
    "CDSP": "후원아동 현황 대시보드를 확인합니다.",
    "KRI": "핵심성과지표(KRI) 대시보드입니다.",
    "LE": "LE 지표 자료(스프레드시트)입니다.",
    "Scorecard": "Global Scorecard(글로벌 성과현황)입니다.",

    // P&C (이미 있는 건 덮어쓰지 않음)
    "인사근태": "출퇴근/연차 등 근태 확인",
    "조직도": "부서·팀 조직도 열기",
    "연락처": "사내 주요 연락처 보기",
    "사번": "사번 관련 정보 조회/관리",
    "LMS 교육": "사내 교육(LMS) 수강·이력 관리",

    // 재경
    "그룹웨어": "전자결재/메일 등 그룹웨어 메인",
    "Bizplay": "법인카드 영수증·비용 정산",
    "Chat FIN": "재경팀용 지식/도구 허브",

    // 신청/접수
    "Blue line": "블루라인 신청 폼",
    "CS": "CS 업무 신청 스프레드시트",
    "L&L": "런치&런(L&L) 신청 폼",
    "IT HELP": "IT 서비스 요청/문의",
    "OA 서비스": "OA(오피스) 서비스 신청",
    "업무요청": "사내 업무 요청 포털",

    // 브랜딩
    "브랜드 허브": "브랜드 가이드/자산 모음",
    "유튜브": "컴패션KR 유튜브 채널",
    "숏츠": "컴패션KR 유튜브 숏츠",
    "네이버 포스트": "컴패션 공식 포스트",

    // Website
    "글로벌 ONE": "Global ONE 포털",
    "CSF": "Salesforce 홈",
    "홈페이지": "컴패션 코리아 홈페이지",
    "US": "컴패션 미국",
    "AU": "컴패션 호주",
    "UK": "컴패션 영국",
    "CA": "컴패션 캐나다",

    // 타기관
    "월드비전": "월드비전 공식 홈페이지",
    "유니세프": "유니세프 한국위원회",
    "굿네이버스": "굿네이버스",
    "세이브더칠드런": "세이브더칠드런",
    "기아대책": "기아대책",
    "초록우산": "초록우산 어린이재단",
    "밀알": "밀알복지재단"
  };

  // 2) 이미 data-tooltip 있는 경우는 건드리지 않고,
  //    (a) data-key 매칭, (b) 없으면 .label 텍스트로 매칭, (c) 그래도 없으면 title을 data-tooltip으로 승격
  document.querySelectorAll('#quick-grid .app').forEach(a=>{
    if (a.hasAttribute('data-tooltip')) return; // 기존 P&C 등은 유지

    // (a) data-key 우선
    const key = a.getAttribute('data-key')?.trim();
    let tip = key && TOOLTIP_MAP[key];

    // (b) label 텍스트로도 시도
    if (!tip) {
      const label = a.querySelector('.label')?.textContent?.trim();
      if (label && TOOLTIP_MAP[label]) tip = TOOLTIP_MAP[label];
    }

    // (c) title이 있으면 승격
    if (!tip && a.title) tip = a.title;

    if (tip) a.setAttribute('data-tooltip', tip);
  });
})();
