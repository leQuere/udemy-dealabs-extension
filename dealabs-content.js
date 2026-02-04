/**
 * Content Script Dealabs - Extension Udemy Auto Dealabs
 * 
 * Ce script s'exécute sur toutes les pages Dealabs et permet:
 * - D'extraire les liens de formations Udemy depuis les deals
 * - D'afficher un panneau de suivi en temps réel sur la page
 * - D'ajouter un bouton de démarrage rapide
 * - De communiquer avec le background script
 */

console.log('Dealabs content script chargé');

// === GESTIONNAIRE DE MESSAGES ===

/**
 * Écoute les messages du background script
 * Messages supportés:
 * - extractLinks: Lancer l'extraction des liens de cours
 * - log: Ajouter une entrée au panneau de logs
 * - updateStats: Mettre à jour les statistiques affichées
 * - automationFinished: Notifier la fin de l'automatisation
 * - launchFromIcon: Lancer l'automatisation via le clic sur l'icône
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message reçu dans dealabs-content:', message);
  if (message.type === 'extractLinks') {
    extractCourseLinks();
    // Ne pas utiliser sendResponse avec setTimeout
  } else if (message.type === 'log') {
    // Ajouter le log au panneau
    addLogToPanel(message.text, message.level);
  } else if (message.type === 'updateStats') {
    // Mettre à jour les stats du panneau
    updatePanelStats(message.stats);
  } else if (message.type === 'automationFinished') {
    // L'automatisation est terminée
    onAutomationFinished();
  } else if (message.type === 'launchFromIcon') {
    // Lancer l'automatisation depuis l'icône de l'extension
    launchAutomationFromIcon();
  }
  // Pas de return true car on ne répond pas de manière asynchrone
});

// === EXTRACTION DES LIENS ===

/**
 * Extrait tous les liens de formations Udemy depuis la page Dealabs actuelle
 * Utilise plusieurs méthodes pour trouver les liens cachés dans le HTML
 */
function extractCourseLinks() {
  console.log('Extraction des liens Dealabs...');
  console.log('URL actuelle:', window.location.href);
  
  // Fonction pour chercher les liens
  const searchLinks = () => {
    const links = [];
    
    try {
      console.log('Recherche dans le HTML brut...');
      const htmlContent = document.body.innerHTML;
      console.log('Longueur HTML:', htmlContent.length);
      
      // Chercher le pattern: "path":"visit threaddesc 3255496 11938614" ou &quot;path&quot;:&quot;visit threaddesc...
      // Pattern pour capturer: visit threaddesc NNNN NNNN
      const regex = /(?:&quot;path&quot;:&quot;|"path":")([^"&]+visit\s+threaddesc\s+\d+\s+\d+)(?:&quot;|")/g;
      
      let match;
      let count = 0;
      
      while ((match = regex.exec(htmlContent)) !== null) {
        count++;
        const pathText = match[1]; // "visit threaddesc 3255496 11938614"
        console.log(`Match #${count}: "${pathText}"`);
        
        // Remplacer les espaces par des /
        const pathParts = pathText.trim().split(/\s+/);
        const url = `https://www.dealabs.com/${pathParts.join('/')}`;
        
        console.log(`✓ URL créée: ${url}`);
        links.push(url);
      }
      
      console.log(`${count} patterns trouvés dans le HTML`);
      
      // Si rien trouvé, essayer une approche alternative
      if (links.length === 0) {
        console.log('Essai avec querySelectorAll...');
        const allLinks = document.querySelectorAll('a[data-c-link]');
        console.log(`Trouvé ${allLinks.length} liens avec data-c-link`);
        
        allLinks.forEach((element, i) => {
          const dataCLink = element.getAttribute('data-c-link');
          if (dataCLink) {
            console.log(`#${i}: ${dataCLink.substring(0, 100)}`);
            try {
              const linkData = JSON.parse(dataCLink);
              if (linkData.path && linkData.path.includes('visit')) {
                const pathParts = linkData.path.trim().split(/\s+/);
                const url = `https://www.dealabs.com/${pathParts.join('/')}`;
                console.log('✓ URL créée via attribut:', url);
                links.push(url);
              }
            } catch (e) {
              console.log('Erreur JSON:', e.message);
            }
          }
        });
      }
      
      console.log(`Total: ${links.length} liens`);
    } catch (error) {
      console.error('ERREUR dans searchLinks:', error);
      console.error('Stack:', error.stack);
    }
    
    return links;
  };
  
  // Essayer plusieurs fois avec des délais croissants
  let attempts = 0;
  const maxAttempts = 5;
  
  const tryExtract = () => {
    attempts++;
    console.log(`Tentative ${attempts}/${maxAttempts}...`);
    
    const links = searchLinks();
    
    if (links.length > 0 || attempts >= maxAttempts) {
      // Dédupliquer
      const uniqueLinks = [...new Set(links)];
      
      console.log(`${uniqueLinks.length} liens uniques trouvés`);
      if (uniqueLinks.length > 0) {
        console.log('Liste:', uniqueLinks);
      }
      
      // Envoyer les liens au background
      chrome.runtime.sendMessage({
        type: 'linksFound',
        links: uniqueLinks
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.log('Erreur envoi liens:', chrome.runtime.lastError.message);
        }
      });
    } else {
      // Réessayer après 500ms
      console.log('Aucun lien trouvé, nouvelle tentative dans 500ms...');
      setTimeout(tryExtract, 500);
    }
  };
  
  tryExtract();
}

//  === PANNEAU DE SUIVI ===

/**
 * Variables globales pour gérer le panneau de suivi
 */
let statsPanel = null;      // Élément DOM du panneau
let logContainer = null;    // Conteneur des logs
let statsElements = {};     // Références aux éléments de statistiques

/**
 * Crée le panneau de suivi visuel qui s'affiche sur la page Dealabs
 * Affiche les statistiques en temps réel et les logs de progression
 */
function createStatsPanel() {
  if (document.getElementById('udemy-auto-panel')) {
    return;
  }

  const panel = document.createElement('div');
  panel.id = 'udemy-auto-panel';
  panel.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 400px;
    max-height: 600px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
    z-index: 10001;
    display: none;
    flex-direction: column;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  panel.innerHTML = `
    <div style="padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <h3 style="margin: 0; font-size: 18px; font-weight: 600;">🎓 Udemy Auto</h3>
        <button id="udemy-panel-close" style="background: rgba(255,255,255,0.2); border: none; color: white; border-radius: 4px; padding: 5px 10px; cursor: pointer; font-size: 16px;">✕</button>
      </div>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 15px; font-size: 13px;">
        <div style="background: rgba(255,255,255,0.15); padding: 8px; border-radius: 6px;">
          <div style="opacity: 0.9;">Total</div>
          <div id="stat-total" style="font-size: 20px; font-weight: 700;">0</div>
        </div>
        <div style="background: rgba(255,255,255,0.15); padding: 8px; border-radius: 6px;">
          <div style="opacity: 0.9;">Traités</div>
          <div id="stat-processed" style="font-size: 20px; font-weight: 700;">0</div>
        </div>
        <div style="background: rgba(76, 175, 80, 0.3); padding: 8px; border-radius: 6px;">
          <div style="opacity: 0.9;">✓ Inscrits</div>
          <div id="stat-enrolled" style="font-size: 20px; font-weight: 700;">0</div>
        </div>
        <div style="background: rgba(33, 150, 243, 0.3); padding: 8px; border-radius: 6px;">
          <div style="opacity: 0.9;">⊙ Déjà</div>
          <div id="stat-already" style="font-size: 20px; font-weight: 700;">0</div>
        </div>
        <div style="background: rgba(255, 152, 0, 0.3); padding: 8px; border-radius: 6px;">
          <div style="opacity: 0.9;">€ Payants</div>
          <div id="stat-paid" style="font-size: 20px; font-weight: 700;">0</div>
        </div>
        <div style="background: rgba(244, 67, 54, 0.3); padding: 8px; border-radius: 6px;">
          <div style="opacity: 0.9;">✕ Erreurs</div>
          <div id="stat-errors" style="font-size: 20px; font-weight: 700;">0</div>
        </div>
      </div>
    </div>
    <div id="udemy-logs" style="flex: 1; overflow-y: auto; padding: 15px; max-height: 400px; background: #f5f5f5;"></div>
  `;

  document.body.appendChild(panel);
  statsPanel = panel;
  logContainer = document.getElementById('udemy-logs');

  // Stocker les références aux éléments stats
  statsElements = {
    total: document.getElementById('stat-total'),
    processed: document.getElementById('stat-processed'),
    enrolled: document.getElementById('stat-enrolled'),
    already: document.getElementById('stat-already'),
    paid: document.getElementById('stat-paid'),
    errors: document.getElementById('stat-errors')
  };

  // Bouton fermer
  document.getElementById('udemy-panel-close').addEventListener('click', () => {
    panel.style.display = 'none';
  });
}

function showStatsPanel() {
  if (!statsPanel) {
    createStatsPanel();
  }
  statsPanel.style.display = 'flex';
  // Réinitialiser les stats
  if (statsElements.total) {
    statsElements.total.textContent = '0';
    statsElements.processed.textContent = '0';
    statsElements.enrolled.textContent = '0';
    statsElements.already.textContent = '0';
    statsElements.paid.textContent = '0';
    statsElements.errors.textContent = '0';
  }
  if (logContainer) {
    logContainer.innerHTML = '';
  }
}

function addLogToPanel(text, level) {
  if (!logContainer) return;

  const logEntry = document.createElement('div');
  logEntry.style.cssText = `
    padding: 8px 12px;
    margin-bottom: 6px;
    border-radius: 6px;
    font-size: 13px;
    line-height: 1.4;
    word-break: break-word;
  `;

  const colors = {
    success: '#e8f5e9',
    error: '#ffebee',
    warning: '#fff3e0',
    info: '#e3f2fd'
  };

  logEntry.style.background = colors[level] || colors.info;
  logEntry.textContent = text;

  logContainer.insertBefore(logEntry, logContainer.firstChild);

  while (logContainer.children.length > 50) {
    logContainer.removeChild(logContainer.lastChild);
  }
}

function updatePanelStats(stats) {
  if (!statsElements.total) return;

  if (stats.total !== undefined) statsElements.total.textContent = stats.total;
  if (stats.processed !== undefined) statsElements.processed.textContent = stats.processed;
  if (stats.achetees !== undefined) statsElements.enrolled.textContent = stats.achetees;
  if (stats.deja !== undefined) statsElements.already.textContent = stats.deja;
  if (stats.payantes !== undefined) statsElements.paid.textContent = stats.payantes;
  if (stats.erreurs !== undefined) statsElements.errors.textContent = stats.erreurs;
}

// Ajouter un bouton sur la page Dealabs
function addQuickStartButton() {
  console.log('Tentative d\'ajout du bouton...');
  console.log('URL:', window.location.href);
  console.log('Pathname:', window.location.pathname);
  
  // Vérifier si on est sur une page de deal
  if (!window.location.pathname.includes('/bons-plans/')) {
    console.log('❌ Pas sur une page /bons-plans/, bouton non ajouté');
    return;
  }
  
  // Vérifier si le bouton n'existe pas déjà
  if (document.getElementById('udemy-auto-button')) {
    console.log('✓ Bouton déjà présent');
    return;
  }
  
  console.log('✓ Création du bouton...');
  
  const button = document.createElement('button');
  button.id = 'udemy-auto-button';
  button.innerHTML = '🎓 Lancer Udemy Auto';
  button.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 15px 25px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
    z-index: 10000;
    transition: all 0.3s;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;
  
  button.addEventListener('mouseenter', () => {
    button.style.transform = 'translateY(-2px)';
    button.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5)';
  });
  
  button.addEventListener('mouseleave', () => {
    button.style.transform = 'translateY(0)';
    button.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
  });
  
  button.addEventListener('click', async () => {
    button.disabled = true;
    button.innerHTML = '⏳ Lancement...';
    
    // Afficher le panneau de suivi
    showStatsPanel();
    
    try {
      // Récupérer l'ID de l'onglet actuel
      const tabs = await chrome.runtime.sendMessage({ type: 'getCurrentTab' });
      
      // Démarrer l'automatisation avec les options par défaut
      const response = await chrome.runtime.sendMessage({
        type: 'startAutomation',
        tabId: tabs ? tabs.id : null,
        options: {
          closeAfter: true,
          skipPaid: true,
          skipEnrolled: true
        }
      });
      
      if (response && response.success) {
        button.innerHTML = '✅ En cours...';
        addLogToPanel('🚀 Automatisation démarrée', 'success');
      } else {
        throw new Error('Échec du lancement');
      }
    } catch (error) {
      console.error('Erreur:', error);
      button.innerHTML = '❌ Erreur';
      addLogToPanel('❌ Erreur: ' + error.message, 'error');
      setTimeout(() => {
        button.innerHTML = '🎓 Lancer Udemy Auto';
        button.disabled = false;
      }, 3000);
    }
  });
  
  document.body.appendChild(button);
  console.log('✅ Bouton ajouté au DOM');
  
  // Créer le panneau (caché au départ)
  createStatsPanel();
}

// Fonction appelée quand l'automatisation est terminée
function onAutomationFinished() {
  const button = document.getElementById('udemy-auto-button');
  if (button) {
    button.innerHTML = '✅ Terminé !';
    button.disabled = false;
    
    // Remettre le texte original après 3 secondes
    setTimeout(() => {
      button.innerHTML = '🎓 Lancer Udemy Auto';
    }, 3000);
  }
  
  addLogToPanel('🎉 Automatisation terminée !', 'success');
}

// Fonction pour lancer l'automatisation depuis l'icône de l'extension
async function launchAutomationFromIcon() {
  console.log('🚀 Lancement depuis l\'icône de l\'extension');
  
  // Afficher le panneau de suivi
  showStatsPanel();
  
  try {
    // Récupérer l'ID de l'onglet actuel
    const tabs = await chrome.runtime.sendMessage({ type: 'getCurrentTab' });
    
    // Démarrer l'automatisation avec les options par défaut
    const response = await chrome.runtime.sendMessage({
      type: 'startAutomation',
      tabId: tabs ? tabs.id : null,
      options: {
        closeAfter: true,
        skipPaid: true,
        skipEnrolled: true
      }
    });
    
    if (response && response.success) {
      addLogToPanel('🚀 Automatisation démarrée', 'success');
    } else {
      throw new Error('Échec du lancement');
    }
  } catch (error) {
    console.error('Erreur:', error);
    addLogToPanel('❌ Erreur: ' + error.message, 'error');
  }
}

// === INITIALISATION ===

// Attendre que le DOM soit chargé et réessayer plusieurs fois
function initButton() {
  console.log('Initialisation du bouton...');
  
  if (!document.body) {
    console.log('Body pas encore prêt, attente...');
    setTimeout(initButton, 100);
    return;
  }
  
  addQuickStartButton();
  
  // Vérifier toutes les 2 secondes si le bouton existe toujours (au cas où il est supprimé)
  setInterval(() => {
    if (window.location.pathname.includes('/bons-plans/') && !document.getElementById('udemy-auto-button')) {
      console.log('Bouton manquant, re-création...');
      addQuickStartButton();
    }
  }, 2000);
}

// Démarrer l'initialisation
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initButton);
} else {
  initButton();
}
