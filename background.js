// Background service worker pour gérer l'automatisation

let isRunning = false;
let currentTabId = null;
let options = {};
let courseLinks = [];
let currentIndex = 0;
let stats = {
  total: 0,
  achetees: 0,
  deja: 0,
  payantes: 0,
  erreurs: 0,
  processed: 0
};

// Écouter les messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background reçu message:', message.type);
  
  if (message.type === 'startAutomation') {
    startAutomation(message.tabId, message.options)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Indique une réponse asynchrone
  } else if (message.type === 'stopAutomation') {
    stopAutomation();
    sendResponse({ success: true });
    return false;
  } else if (message.type === 'getCurrentTab') {
    // Récupérer l'onglet qui a envoyé le message
    if (sender.tab) {
      sendResponse({ success: true, id: sender.tab.id });
    } else {
      sendResponse({ success: false, error: 'Tab not found' });
    }
    return false;
  } else if (message.type === 'linksFound') {
    handleLinksFound(message.links, sender.tab ? sender.tab.id : currentTabId)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Indique une réponse asynchrone
  } else if (message.type === 'courseProcessed') {
    handleCourseProcessed(message.result);
    sendResponse({ success: true });
    return false;
  }
  return false;
});

// Démarrer l'automatisation
async function startAutomation(tabId, opts) {
  isRunning = true;
  currentTabId = tabId;
  options = opts;
  currentIndex = 0;
  
  // Réinitialiser les stats
  stats = {
    total: 0,
    achetees: 0,
    deja: 0,
    payantes: 0,
    erreurs: 0,
    processed: 0
  };
  chrome.storage.local.set({ stats });
  
  console.log('Démarrage de l\'automatisation sur l\'onglet:', tabId);
  console.log('Options:', opts);
  sendLog('📡 Extraction des liens de formation...', 'info');
  
  // Vérifier l'URL de l'onglet
  try {
    const tab = await chrome.tabs.get(tabId);
    console.log('URL de l\'onglet:', tab.url);
    
    if (!tab.url || !tab.url.includes('dealabs.com')) {
      throw new Error('Vous devez être sur une page Dealabs');
    }
  } catch (error) {
    console.error('Erreur lors de la vérification de l\'onglet:', error);
    sendLog('❌ ' + error.message, 'error');
    stopAutomation();
    return;
  }
  
  // Injecter le script pour extraire les liens
  try {
    console.log('Envoi du message extractLinks au content script...');
    
    // Vérifier que le content script est bien chargé en essayant d'envoyer un ping
    try {
      await chrome.tabs.sendMessage(tabId, { type: 'extractLinks' });
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      
      if (error.message && error.message.includes('Receiving end does not exist')) {
        // Le content script n'est pas chargé, essayer de l'injecter manuellement
        sendLog('⚠️ Injection manuelle du content script...', 'warning');
        
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['dealabs-content.js']
          });
          
          // Le script est injecté
          
          // Réessayer d'envoyer le message
          await chrome.tabs.sendMessage(tabId, { type: 'extractLinks' });
          
        } catch (injectError) {
          sendLog('❌ Impossible d\'injecter le script. Veuillez rafraîchir la page Dealabs (F5) et réessayer', 'error');
          console.error('Erreur d\'injection:', injectError);
          stopAutomation();
        }
      } else {
        sendLog('❌ Erreur: ' + error.message, 'error');
        stopAutomation();
      }
    }
  } catch (error) {
    console.error('Erreur lors de l\'extraction des liens:', error);
    sendLog('❌ Erreur: ' + error.message, 'error');
    stopAutomation();
  }
}

// Arrêter l'automatisation
function stopAutomation() {
  isRunning = false;
  currentTabId = null;
  courseLinks = [];
  currentIndex = 0;
  
  sendStatus('⏹ Automatisation arrêtée', false);
}

// Gérer les liens trouvés
async function handleLinksFound(links, tabId) {
  if (!isRunning) return;
  
  console.log(`${links.length} liens trouvés depuis l'onglet:`, tabId);
  courseLinks = links;
  
  sendLog(`✓ ${links.length} formations trouvées`, 'success');
  sendStats({ total: links.length, processed: 0 });
  
  if (links.length === 0) {
    sendLog('⚠️ Aucune formation trouvée sur cette page', 'warning');
    stopAutomation();
    return;
  }
  
  // Commencer le traitement
  console.log('Début du traitement des cours...');
  processNextCourse();
}

// Traiter le cours suivant
async function processNextCourse() {
  if (!isRunning || currentIndex >= courseLinks.length) {
    if (currentIndex >= courseLinks.length) {
      sendLog('✅ Tous les cours ont été traités!', 'success');
      sendStatus('✅ Terminé!', false);
      
      // Notifier le content script Dealabs que c'est terminé
      if (currentTabId) {
        chrome.tabs.sendMessage(currentTabId, {
          type: 'automationFinished'
        }).catch(err => {
          console.log('Content script Dealabs non disponible');
        });
      }
    }
    stopAutomation();
    return;
  }
  
  const link = courseLinks[currentIndex];
  
  sendLog(`[${currentIndex + 1}/${courseLinks.length}] Traitement: ${link}`, 'info');
  
  // Ouvrir le lien dans un nouvel onglet
  try {
    const newTab = await chrome.tabs.create({ url: link, active: false });
    
    // Attendre la redirection vers Udemy
    await waitForUdemyRedirection(newTab.id);
    
  } catch (error) {
    sendLog(`❌ Erreur: ${error.message}`, 'error');
    currentIndex++;
    sendStats({ processed: currentIndex, erreurs: 1 });
    
    // Toujours attendre 2 secondes entre chaque cours pour éviter les erreurs Chrome
    setTimeout(processNextCourse, 2000);
  }
}

// Attendre la redirection vers Udemy
async function waitForUdemyRedirection(tabId) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const maxAttempts = 20;
    
    const checkInterval = setInterval(async () => {
      attempts++;
      
      try {
        const tab = await chrome.tabs.get(tabId);
        
        if (tab.url && tab.url.includes('udemy.com/course/')) {
          clearInterval(checkInterval);
          
          // Attendre 1.5s que la page charge le content script
          setTimeout(async () => {
            await processUdemyCourse(tabId);
            resolve();
          }, 1500);
        } else if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          await chrome.tabs.remove(tabId);
          reject(new Error('Timeout: pas de redirection vers Udemy'));
        }
      } catch (error) {
        clearInterval(checkInterval);
        reject(error);
      }
    }, 500);
  });
}

// Traiter un cours Udemy
async function processUdemyCourse(tabId) {
  try {
    // Récupérer l'URL de l'onglet
    const tab = await chrome.tabs.get(tabId);
    const udemyUrl = tab.url;
    
    // Envoyer un message au content script Udemy avec gestion d'erreur
    let response;
    try {
      response = await chrome.tabs.sendMessage(tabId, { type: 'checkAndEnroll' });
    } catch (error) {
      // Si le content script n'est pas chargé, l'injecter
      if (error.message && error.message.includes('Receiving end does not exist')) {
        console.log('⚠️ Content script non chargé, injection manuelle...');
        
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['udemy-content.js']
          });
          
          // Attendre un peu et réessayer
          await new Promise(resolve => setTimeout(resolve, 1000));
          response = await chrome.tabs.sendMessage(tabId, { type: 'checkAndEnroll' });
        } catch (injectError) {
          throw new Error('Impossible d\'injecter le content script: ' + injectError.message);
        }
      } else {
        throw error;
      }
    }
    
    if (response) {
      response.url = udemyUrl;
      handleCourseProcessed(response);
    }
    
    // Fermer l'onglet et passer au suivant
    try {
      await chrome.tabs.remove(tabId);
    } catch (e) {}
    
    currentIndex++;
    
    // Passer immédiatement au suivant
    processNextCourse();
    
  } catch (error) {
    sendLog(`❌ Erreur Udemy: ${error.message}`, 'error');
    
    try {
      await chrome.tabs.remove(tabId);
    } catch (e) {}
    
    currentIndex++;
    sendStats({ processed: currentIndex, erreurs: 1 });
    
    // Toujours attendre 2 secondes entre chaque cours pour éviter les erreurs Chrome
    setTimeout(processNextCourse, 2000);
  }
}

// Gérer le résultat du traitement d'un cours
function handleCourseProcessed(result) {
  const statsUpdate = { processed: currentIndex + 1 };
  
  // Extraire le nom du cours de l'URL si disponible
  let courseUrlShort = '';
  if (result.url) {
    try {
      const urlObj = new URL(result.url);
      courseUrlShort = urlObj.pathname.replace('/course/', '');
      // Garder seulement le slug du cours (avant les paramètres)
      courseUrlShort = courseUrlShort.split('/')[0];
    } catch (e) {}
  }
  
  const urlInfo = result.url ? `\n   🔗 ${result.url}` : '';
  console.log("result status "+result.status)
  if (result.status === 'enrolled') {
    sendLog(`✓ ${result.title} - Inscrit!${urlInfo}`, 'success');
    statsUpdate.achetees = 1;
  } else if (result.status === 'already_enrolled') {
    sendLog(`⊙ ${result.title} - Déjà inscrit${urlInfo}`, 'info');
    statsUpdate.deja = 1;
  } else if (result.status === 'paid') {
    sendLog(`€ ${result.title} - Payant (ignoré)${urlInfo}`, 'warning');
    statsUpdate.payantes = 1;
  } else {
    sendLog(`? ${result.title} - Statut inconnu${urlInfo}`, 'warning');
    statsUpdate.erreurs = 1;
  }
  
  sendStats(statsUpdate);
}

// Envoyer les stats à la popup
function sendStats(updates) {
  // Mettre à jour les stats locales
  if (updates.total !== undefined) {
    stats.total = updates.total;
  }
  if (updates.processed !== undefined) {
    stats.processed = updates.processed;
  }
  if (updates.achetees !== undefined) {
    stats.achetees += updates.achetees;
  }
  if (updates.deja !== undefined) {
    stats.deja += updates.deja;
  }
  if (updates.payantes !== undefined) {
    stats.payantes += updates.payantes;
  }
  if (updates.erreurs !== undefined) {
    stats.erreurs += updates.erreurs;
  }
  
  // Sauvegarder dans chrome.storage
  chrome.storage.local.set({ stats });
  
  // Envoyer à la popup si elle est ouverte
  chrome.runtime.sendMessage({
    type: 'updateStats',
    stats: updates
  }).catch(err => {
    console.log('Popup fermée, impossible d\'envoyer les stats');
  });
  
  // Envoyer aussi au content script Dealabs si disponible
  if (currentTabId) {
    chrome.tabs.sendMessage(currentTabId, {
      type: 'updateStats',
      stats: stats
    }).catch(err => {
      console.log('Content script Dealabs non disponible');
    });
  }
}

// Envoyer un log à la popup
function sendLog(text, level) {
  console.log(`[${level}]`, text);
  chrome.runtime.sendMessage({
    type: 'log',
    text,
    level
  }).catch(err => {
    console.log('Popup fermée, impossible d\'envoyer le log');
  });
  
  // Envoyer aussi au content script Dealabs si disponible
  if (currentTabId) {
    chrome.tabs.sendMessage(currentTabId, {
      type: 'log',
      text,
      level
    }).catch(err => {
      console.log('Content script Dealabs non disponible');
    });
  }
}

// Envoyer le statut à la popup
function sendStatus(text, running) {
  chrome.runtime.sendMessage({
    type: 'status',
    text,
    running
  }).catch(err => {
    console.log('Popup fermée, impossible d\'envoyer le statut');
  });
}
