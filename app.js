// life meexmo — Client-side logic (improvements)
const STORAGE_KEY = 'life_meexmo_data_v1';

function loadData(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if(!raw) return {user:null, workouts:[], meals:[]};
  try { return JSON.parse(raw); } catch(e){ return {user:null, workouts:[], meals:[]}; }
}
function saveData(d){ localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); }

const state = loadData();

// Elements
const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('username');
const dashboard = document.getElementById('dashboard');
const userLabel = document.getElementById('userLabel');
const userControls = document.getElementById('userControls');
const userDisplay = document.getElementById('userDisplay');
const logoutBtn = document.getElementById('logoutBtn');
const backToLoginBtn = document.getElementById('backToLogin');
const hero = document.getElementById('hero');
const heroLeft = document.getElementById('heroLeft');

const workoutForm = document.getElementById('workoutForm');
const mealForm = document.getElementById('mealForm');
const totalCaloriesEl = document.getElementById('totalCalories');
const caloriesBurnedEl = document.getElementById('caloriesBurned');
const netCaloriesEl = document.getElementById('netCalories');
const analysisText = document.getElementById('analysisText');

const calChartCtx = document.getElementById('calChart')?.getContext('2d');
const macroChartCtx = document.getElementById('macroChart')?.getContext('2d');
const freqChartCtx = document.getElementById('freqChart')?.getContext('2d');

let calChart, macroChart, freqChart;

// Testimonials
const tTrack = document.getElementById('tTrack');
const btnPrev = document.querySelector('.t-prev');
const btnNext = document.querySelector('.t-next');
let testimonials = [];
let tIndex = 0;

function initTestimonials(){
  testimonials = Array.from(document.querySelectorAll('.testimonial'));
  if(!testimonials.length) return;
  updateTestimonialButtons();
  // handle resize: re-show current
  window.addEventListener('resize', ()=> showTestimonial(tIndex));
  // touch support
  let startX = null;
  tTrack && tTrack.addEventListener('touchstart', e=> startX = e.touches[0].clientX);
  tTrack && tTrack.addEventListener('touchend', e=>{
    if(startX === null) return;
    const endX = e.changedTouches[0].clientX;
    const diff = startX - endX;
    if(diff > 30) nextTestimonial();
    if(diff < -30) prevTestimonial();
    startX = null;
  });
}
function updateTestimonialButtons(){
  if(!btnPrev || !btnNext) return;
  btnPrev.disabled = testimonials.length <= 1;
  btnNext.disabled = testimonials.length <= 1;
}
function testimonialWidth(){
  if(!testimonials.length) return 0;
  const rect = testimonials[0].getBoundingClientRect();
  return rect.width + 12; // include gap
}
function showTestimonial(i){
  if(!tTrack || testimonials.length===0) return;
  if(i < 0) i = 0;
  if(i >= testimonials.length) i = testimonials.length - 1;
  tIndex = i;
  const w = testimonialWidth();
  const viewport = tTrack.parentElement;
  if(viewport) viewport.scrollTo({ left: i * w, behavior: 'smooth' });
  updateArrowsState();
}
function nextTestimonial(){ showTestimonial(tIndex + 1); }
function prevTestimonial(){ showTestimonial(tIndex - 1); }
function updateArrowsState(){ if(!btnPrev || !btnNext) return; btnPrev.disabled = tIndex === 0; btnNext.disabled = tIndex >= testimonials.length - 1; }

btnNext && btnNext.addEventListener('click', nextTestimonial);
btnPrev && btnPrev.addEventListener('click', prevTestimonial);

// UI control
function showDashboard(){
  document.querySelector('.hero').classList.add('hidden');
  dashboard.classList.remove('hidden');
  userLabel.textContent = state.user || 'life meexmo';
  userControls && (userControls.style.display = 'flex');
  userDisplay && (userDisplay.textContent = state.user || '');
  renderAll();
}
function showHero(){
  document.querySelector('.hero').classList.remove('hidden');
  dashboard.classList.add('hidden');
  userControls && (userControls.style.display = 'none');
}

logoutBtn && logoutBtn.addEventListener('click', ()=>{
  state.user = null;
  saveData(state);
  showHero();
});
backToLoginBtn && backToLoginBtn.addEventListener('click', ()=>{
  showHero();
});

if(state.user){ showDashboard(); } else { showHero(); }

loginForm && loginForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  const name = usernameInput.value.trim();
  if(!name) return alert('Digite seu nome.');
  state.user = name;
  saveData(state);
  const card = document.getElementById('loginCard');
  card.classList.add('pulse');
  setTimeout(()=>{ card.classList.remove('pulse'); showDashboard(); }, 600);
});

workoutForm && workoutForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  const type = document.getElementById('w-type').value;
  const duration = parseFloat(document.getElementById('w-duration').value) || 0;
  const intensityFactor = parseFloat(document.getElementById('w-intensity').value) || 0.12;
  const date = new Date().toISOString();
  const caloriesBurned = Math.round(duration * intensityFactor * 10);
  state.workouts.push({type, duration, intensityFactor, caloriesBurned, date});
  saveData(state);
  flashCard('workoutCard');
  renderAll();
  workoutForm.reset();
  document.getElementById('w-duration').value = 30;
  document.getElementById('w-intensity').value = 0.12;
});

mealForm && mealForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  const name = document.getElementById('m-name').value || 'Refeição';
  const calories = parseInt(document.getElementById('m-cal').value) || 0;
  const protein = parseInt(document.getElementById('m-protein').value) || 0;
  const carbs = parseInt(document.getElementById('m-carbs').value) || 0;
  const fat = parseInt(document.getElementById('m-fat').value) || 0;
  const date = new Date().toISOString();
  state.meals.push({name, calories, protein, carbs, fat, date});
  saveData(state);
  flashCard('mealCard');
  renderAll();
  mealForm.reset();
  document.getElementById('m-cal').value = 500;
});

function flashCard(id){
  const el = document.getElementById(id);
  if(!el) return;
  el.classList.add('pulse');
  setTimeout(()=>el.classList.remove('pulse'),900);
}

function getTotals(){
  const totalMealCal = state.meals.reduce((s,m)=>s+m.calories,0);
  const totalBurn = state.workouts.reduce((s,w)=>s+w.caloriesBurned,0);
  const protein = state.meals.reduce((s,m)=>s+m.protein,0);
  const carbs = state.meals.reduce((s,m)=>s+m.carbs,0);
  const fat = state.meals.reduce((s,m)=>s+m.fat,0);
  return {totalMealCal, totalBurn, protein, carbs, fat};
}

function renderAll(){
  const {totalMealCal, totalBurn, protein, carbs, fat} = getTotals();
  totalCaloriesEl && (totalCaloriesEl.textContent = totalMealCal);
  caloriesBurnedEl && (caloriesBurnedEl.textContent = totalBurn);
  netCaloriesEl && (netCaloriesEl.textContent = (totalMealCal - totalBurn));

  const dayLabels = getLastNDaysLabels(12);
  const caloriesByDay = dayLabels.map(d => totalCaloriesOn(d));
  const burnByDay = dayLabels.map(d => totalBurnOn(d));

  if(calChartCtx){ if(calChart) calChart.destroy(); calChart = new Chart(calChartCtx, { type:'bar', data:{ labels: dayLabels, datasets:[ { label:'Calorias consumidas', data: caloriesByDay, backgroundColor: 'rgba(225,17,17,0.9)' }, { label:'Calorias gastas', data: burnByDay, backgroundColor: 'rgba(20,20,20,0.95)' } ] }, options:{ responsive:true, plugins:{ legend:{labels:{color:'#fff'} }}, scales:{ x:{ticks:{color:'#fff'}}, y:{ ticks:{color:'#fff'} } } }); }

  if(macroChartCtx){ if(macroChart) macroChart.destroy(); macroChart = new Chart(macroChartCtx, { type:'doughnut', data:{ labels:['Proteínas (g)','Carboidratos (g)','Gorduras (g)'], datasets:[{ data:[protein, carbs, fat], backgroundColor:['#ff6b6b','#ffd36b','#8b8b8b'] }] }, options:{ plugins:{ legend:{ position:'bottom', labels:{color:'#fff'} } }, responsive:true } }); }

  const typeCounts = {};
  state.workouts.forEach(w => typeCounts[w.type] = (typeCounts[w.type] || 0) + 1);
  if(freqChartCtx){ if(freqChart) freqChart.destroy(); freqChart = new Chart(freqChartCtx, { type:'bar', data:{ labels:Object.keys(typeCounts), datasets:[{ label:'Sessões', data:Object.values(typeCounts), backgroundColor:Object.keys(typeCounts).map(()=> '#e11') }] }, options:{ responsive:true, plugins:{ legend:{display:false}}, scales:{ x:{ticks:{color:'#fff'}}, y:{ ticks:{color:'#fff'} } } } }); }

  let analysis = '';
  if(state.workouts.length === 0 && state.meals.length === 0){ analysis = 'Comece registrando treinos e refeições — aqui aparecerão suas recomendações.'; }
  else {
    if(totalBurn < totalMealCal) { analysis += `Você está em superávit calórico (consumo maior que gasto) de ${totalMealCal - totalBurn} kcal. `; analysis += 'Se seu objetivo for perder gordura, considere ajustar ingestão ou aumentar treinos.\n'; }
    else { analysis += `Você está em déficit calórico de ${totalBurn - totalMealCal} kcal. `; analysis += 'Se deseja ganhar massa, aumente calorias e foque em proteínas.\n'; }
    const workoutsPerWeek = estimateWorkoutsPerWeek();
    analysis += `Média de treinos por semana: ${workoutsPerWeek.toFixed(1)}. `;
    if(workoutsPerWeek < 2) analysis += 'Tente aumentar consistência para melhores resultados.';
    else if(workoutsPerWeek <=4) analysis += 'Boa consistência — mantenha e procure progressão de cargas/intensidade.';
    else analysis += 'Excelente frequência! Foque em recuperação e qualidade.';
  }
  analysisText && (analysisText.textContent = analysis);
}

function yyyymmdd(dateStr){ const d = new Date(dateStr); const y = d.getFullYear(); const m = String(d.getMonth()+1).padStart(2,'0'); const day = String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${day}`; }
function getLastNDaysLabels(n){ const labels = []; const now = new Date(); for(let i=n-1;i>=0;i--){ const d = new Date(now); d.setDate(now.getDate() - i); labels.push( yyyymmdd(d.toISOString()) ); } return labels; }
function totalCaloriesOn(ymd){ return state.meals.filter(m => yyyymmdd(m.date) === ymd).reduce((s,m)=>s+m.calories,0); }
function totalBurnOn(ymd){ return state.workouts.filter(w => yyyymmdd(w.date) === ymd).reduce((s,w)=>s+w.caloriesBurned,0); }
function estimateWorkoutsPerWeek(){ if(state.workouts.length === 0) return 0; const dates = state.workouts.map(w => new Date(w.date)); const min = new Date(Math.min(...dates)); const max = new Date(Math.max(...dates)); const weeks = Math.max(1, (max - min) / (1000 * 60 * 60 * 24 * 7)); return state.workouts.length / weeks; }

if(state.workouts.length===0 && state.meals.length===0){ const now = new Date(); for(let d=0; d<3; d++){ const day = new Date(now); day.setDate(now.getDate() - d); state.meals.push({ name:`Exemplo ${d+1}`, calories: 1800 - d*50, protein:80, carbs:200, fat:60, date: day.toISOString() }); } state.workouts.push({ type:'Musculação', duration:45, intensityFactor:0.12, caloriesBurned: Math.round(45*0.12*10), date: new Date().toISOString() }); saveData(state); }

if(state.user) renderAll();

window.addEventListener('load', ()=>{
  document.body.classList.add('entered');
  initTestimonials();
  showTestimonial(0);
});

hero && hero.addEventListener('mousemove', (e)=>{
  const rect = hero.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width - 0.5;
  const y = (e.clientY - rect.top) / rect.height - 0.5;
  heroLeft && (heroLeft.style.transform = `translate(${x * 6}px, ${y * 4}px)`);
});
hero && hero.addEventListener('mouseleave', ()=>{ heroLeft && (heroLeft.style.transform = ''); });
