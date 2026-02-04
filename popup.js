/**
 * Popup UI - Extension Udemy Auto Dealabs
 * 
 * Gère l'interface utilisateur de la popup de l'extension:
 * - Boutons de démarrage/arrêt
 * - Affichage des statistiques en temps réel
 * - Journal des logs
 * - Vérification de la page active
 */

// === VARIABLES D'ÉTAT ===

/** Indique si l'automatisation est en cours */
let isRunning = false;

/** Statistiques de progression */
let stats = {
  total: 0,
  achetees: 0,
  deja: 0,
  payantes: 0,
  erreurs: 0,
  processed: 0
};

// === ÉLÉMENTS DOM ===

/** Références aux éléments de l'interface */
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusMessage = document.getElementById('statusMessage');
const logContainer = document.getElementById('logContainer');

// === INITIALISATION ===

/**
 * Initialise la popup au chargement
 * - Charge les statistiques sauvegardées
 * - Vérifie la page active
 * - Configure les écouteurs d'événements
 */
document.addEventListener('DOMContentLoaded', () => {
  loadStats();
  checkCurrentPage();
  
  startBtn.addEventListener('click', startAutomation);
  stopBtn.addEventListener('click', stopAutomation);
  
  // Écouter les messages du background
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'updateStats') {
      updateStats(message.stats);
    } else if (message.type === 'log') {
      addLog(message.text, message.level);
    } else if (message.type === 'status') {
      updateStatus(message.text, message.running);
    }
  });
});

// === FONCTIONS ===

/**
 * Vérifie si l'onglet actif est une page Dealabs
 * Active ou désactive le bouton de démarrage en conséquence
 */
async function checkCurrentPage() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (tab && tab.url && tab.url.includes('dealabs.com')) {
    statusMessage.textContent = '✅ Page Dealabs détectée - Prêt à démarrer';
    statusMessage.style.background = '#c6f6d5';
    statusMessage.style.color = '#22543d';
    startBtn.disabled = false;
  } else {
    statusMessage.textContent = '⚠️ Ouvrez une page Dealabs pour commencer';
    statusMessage.style.background = '#fef5e7';
 **
 * Démarre l'automatisation depuis la popup
 * Envoie un message au background script avec les options choisies
 */r = '#744210';
    startBtn.disabled = true;
  }
}

// Démarrer l'automatisation
async function startAutomation() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab || !tab.url || !tab.url.includes('dealabs.com')) {
    addLog('❌ Veuillez ouvrir une page Dealabs', 'error');
    return;
  }
  
  isRunning = true;
  startBtn.style.display = 'none';
  stopBtn.style.display = 'block';
  
  // Réinitialiser les stats
  stats = { total: 0, achetees: 0, deja: 0, payantes: 0, erreurs: 0, processed: 0 };
  updateStats(stats);
  
  statusMessage.textContent = '🚀 Automatisation en cours...';
  statusMessage.classList.add('running');
  
  addLog('🚀 Démarrage de l\'automatisation...', 'info');
  
  console.log('Envoi du message startAutomation au background...');
  
  // Envoyer le message au background pour démarrer
  chrome.runtime.sendMessage({
    type: 'startAutomation',
    tabId: tab.id,
    options: {
      autoCheckout: document.getElementById('autoCheckout').checked,
      delay: document.getElementById('delayBetween').checked
    }
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Erreur lors de l\'envoi du message:', chrome.runtime.lastError);
      addLog('❌ Erreur de communication avec le background', 'error');
      stopAutomation();
    } else {
      console.log('Message envoyé avec succès, réponse:', response);
    }
 **
 * Arrête l'automatisation en cours
 * Remet l'interface à son état initial
 */
}

// Arrêter l'automatisation
function stopAutomation() {
  isRunning = false;
  startBtn.style.display = 'block';
  stopBtn.style.display = 'none';
  
  statusMessage.textContent = '⏹ Automatisation arrêtée';
  statusMessage.classList.remove('running');
 **
 * Met à jour l'affichage des statistiques dans la popup
 * @param {Object} newStats - Nouvelles valeurs de statistiques
 */
  addLog('⏹ Arrêt demandé', 'warning');
  
  chrome.runtime.sendMessage({ type: 'stopAutomation' });
}

// Mettre à jour les statistiques
function updateStats(newStats) {
  // Additionner les nouvelles valeurs aux stats existantes (sauf pour 'total' et 'processed' qui sont absolus)
  if (newStats.total !== undefined) {
    stats.total = newStats.total;
  }
  if (newStats.processed !== undefined) {
    stats.processed = newStats.processed;
  }
  if (newStats.achetees !== undefined) {
    stats.achetees += newStats.achetees;
  }
  if (newStats.deja !== undefined) {
    stats.deja += newStats.deja;
  }
  if (newStats.payantes !== undefined) {
    stats.payantes += newStats.payantes;
  }
  if (newStats.erreurs !== undefined) {
    stats.erreurs += newStats.erreurs;
  }
  
  document.getElementById('statTotal').textContent = stats.total;
  document.getElementById('statAchetees').textContent = stats.achetees;
  document.getElementById('statDeja').textContent = stats.deja;
  document.getElementById('statPayantes').textContent = stats.payantes;
  document.getElementById('statErreurs').textContent = stats.erreurs;
  
  // Mettre à jour la barre de progression
  if (stats.total > 0) {
    const progress = (stats.processed / stats.total) * 100;
    document.getElementById('progressFill').style.width = progress + '%';
 **
 * Ajoute une entrée au journal de logs de la popup
 * @param {string} text - Message à afficher
 * @param {string} level - Niveau: 'info', 'success', 'warning', 'error'
 */gressText').textContent = Math.round(progress) + '%';
  }
  
  saveStats();
}

// Ajouter une entrée au journal
function addLog(text, level = 'info') {
  const entry = document.createElement('div');
  entry.className = `log-entry ${level}`;
  entry.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
  
  logContainer.appendChild(entry);
  logContainer.scrollTop = logContainer.scrollHeight;
 **
 * Met à jour le message de statut de la popup
 * @param {string} text - Texte à afficher
 * @param {boolean} running - Si l'automatisation est en cours
 */
  // Limiter à 100 entrées
  while (logContainer.children.length > 100) {
    logContainer.removeChild(logContainer.firstChild);
  }
}

// Mettre à jour le statut
function updateStatus(text, running) {
 **
 * Sauvegarde les statistiques dans le stockage local
 */ent = text;
  if (running) {
    statusMessage.classList.add('running');
 **
 * Charge les statistiques depuis le stockage local au démarrage
 */
    statusMessage.classList.remove('running');
  }
}

// Sauvegarder les stats
function saveStats() {
  chrome.storage.local.set({ stats });
}

// Charger les stats
function loadStats() {
  chrome.storage.local.get(['stats'], (result) => {
    if (result.stats) {
      stats = { ...result.stats };
      // Afficher les stats sans les additionner
      document.getElementById('statTotal').textContent = stats.total || 0;
      document.getElementById('statAchetees').textContent = stats.achetees || 0;
      document.getElementById('statDeja').textContent = stats.deja || 0;
      document.getElementById('statPayantes').textContent = stats.payantes || 0;
      document.getElementById('statErreurs').textContent = stats.erreurs || 0;
      
      if (stats.total > 0) {
        const progress = ((stats.processed || 0) / stats.total) * 100;
        document.getElementById('progressFill').style.width = progress + '%';
        document.getElementById('progressText').textContent = Math.round(progress) + '%';
      }
    }
  });
}
