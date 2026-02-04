/**
 * Content Script Udemy - Extension Udemy Auto Dealabs
 * 
 * Ce script s'exécute sur toutes les pages Udemy et permet:
 * - De vérifier si un cours est gratuit
 * - De détecter si l'utilisateur est déjà inscrit
 * - De s'inscrire automatiquement aux cours gratuits
 * - De gérer le processus de checkout si nécessaire
 */

// === GESTIONNAIRE DE MESSAGES ===

/**
 * Écoute les messages du background script
 * Messages supportés:
 * - checkAndEnroll: Vérifier et s'inscrire au cours actuel
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'checkAndEnroll') {
    checkAndEnrollInCourse().then(result => {
      sendResponse(result);
    });
    return true; // Pour réponse asynchrone
  }
});

// === FONCTION PRINCIPALE ===

/**
 * Fonction principale qui vérifie le statut d'un cours et tente l'inscription
 * @returns {Object} Résultat: {status: 'enrolled'|'already_enrolled'|'paid'|'error', title: string}
 */
async function checkAndEnrollInCourse() {
  console.log('Vérification du cours Udemy...');
  
  // Attendre que la page soit complètement chargée
  await waitForPageLoad();
  
  const courseTitle = getCourseTitle();
  
  // Vérifier si déjà inscrit
  const alreadyEnrolled = checkIfAlreadyEnrolled();
  if (alreadyEnrolled) {
    return {
      status: 'already_enrolled',
      title: courseTitle
    };
  }
  
  // Vérifier si gratuit
  const isFree = checkIfFree();
  if (!isFree) {
    return {
      status: 'paid',
      title: courseTitle
    };
  }
  
  // Essayer de s'inscrire
  const enrolled = await enrollInCourse();
  
  return {
   === FONCTIONS UTILITAIRES ===

/**
 * Attend que la page Udemy soit complètement chargée et que les informations de prix soient disponibles
 * @returns {Promise<void>}
 */'error',
    title: courseTitle
  };
}

// Attendre que la page soit chargée
function waitForPageLoad() {
  return new Promise(async (resolve) => {
    console.log('⏳ Début du chargement de la page...');
    
    // Attendre que le DOM soit chargé
    if (document.readyState === 'loading') {
      await new Promise(r => document.addEventListener('DOMContentLoaded', r));
    }
    
    console.log('⏳ DOM chargé, attente du contenu dynamique...');
    
    // Attendre un peu pour le JavaScript dynamique initial
    await new Promise(r => setTimeout(r, 1000));
    
    // Attendre spécifiquement que le prix ou "Gratuit" apparaisse (jusqu'à 20 secondes)
    let attempts = 0;
    const maxAttempts = 40; // 40 x 500ms = 20 secondes max
    let foundPriceInfo = false;
    
    while (attempts < maxAttempts) {
      attempts++;
      
      // Chercher spécifiquement <span>Gratuit</span> ou <span>Free</span>
      const spans = document.querySelectorAll('span');
      for (const span of spans) {
        const text = span.textContent.trim().toLowerCase();
        if (span.children.length === 0 && text.length < 20) {
          if (text === 'gratuit' || text === 'free') {
            console.log('✅ "Gratuit" trouvé! (tentative ' + attempts + ')');
            foundPriceInfo = true;
            break;
          }
        }
      }
      
      // Chercher aussi des éléments de prix payants
      if (!foundPriceInfo) {
        const priceElements = document.querySelectorAll('[data-purpose*="buy"], [class*="price"], button[data-purpose], .buy-box');
        const hasButtons = document.querySelectorAll('button').length > 5;
        
        // Vérifier s'il y a un prix dans le texte de la page
        const bodyText = document.body.textContent;
        const hasPriceInText = /\d+[.,]\d{2}\s*[€$£]/.test(bodyText);
        
        if (priceElements.length > 3 || hasPriceInText || hasButtons) {
          console.log('✅ Informations de prix trouvées (tentative ' + attempts + ')');
          foundPriceInfo = true;
        }
      }
      
      if (foundPriceInfo) {
        break;
      }
      
      // Log tous les 4 tentatives (2 secondes)
      if (attempts % 4 === 0) {
        console.log(`⏳ Attente du prix... (${attempts * 0.5}s écoulées)`);
      }
      
      await new Promise(r => setTimeout(r, 200));
    }
    
    if (foundPriceInfo) {
      console.log('✅ Informations de prix détectées!');
    } else {
      console.log('⚠️ Timeout: prix non détecté, on continue quand même...');
    }
    
 **
 * Extrait le titre du cours depuis la page Udemy
 * @returns {string} Titre du cours ou 'Formation Udemy' par défaut
 */t terminé');
    resolve();
  });
}

// Obtenir le titre du cours
function getCourseTitle() {
  const selectors = [
    'h1[data-purpose="lead-title"]',
    'h1.clp-lead__title',
    'h1',
    'meta[property="og:title"]'
  ];
  
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      if (element.tagName === 'META') {
        return element.content || 'Formation Udemy';
      }
      return element.textContent.trim() || 'Formation Udemy';
    }
  }
  
 **
 * Vérifie si l'utilisateur est déjà inscrit au cours
 * Utilise plusieurs méthodes de détection pour plus de fiabilité
 * @returns {boolean} true si déjà inscrit, false sinon
 */
}

// Vérifier si déjà inscrit
function checkIfAlreadyEnrolled() {
  console.log('🔍 === VÉRIFICATION DÉJÀ INSCRIT ===');
  
  // Méthode 0 : Chercher le texte "Vous avez acheté ce cours" ou "You purchased this course"
  console.log('Méthode 0: Recherche texte "acheté/purchased"...');
  const bodyText = document.body.textContent || '';
  if (bodyText.includes('Vous avez acheté ce cours') || 
      bodyText.includes('You purchased this course') ||
      bodyText.includes('You bought this course')) {
    console.log('✅ DÉJÀ INSCRIT/ACHETÉ détecté via texte "acheté/purchased"');
    return true;
  }
  
  // Méthode 1 : Chercher les éléments avec data-purpose SPÉCIFIQUES
  console.log('Méthode 1: Recherche data-purpose go-to-course...');
  const goToCourseElements = document.querySelectorAll('[data-purpose="go-to-course-button"], a[href*="/course/learning/"]');
  if (goToCourseElements.length > 0) {
    console.log('✅ DÉJÀ INSCRIT détecté via data-purpose="go-to-course-button"');
    return true;
  }
  
  // Méthode 2 : Chercher les boutons TRÈS SPÉCIFIQUES
  console.log('Méthode 2: Analyse des boutons (stricte)...');
  const buttons = document.querySelectorAll('button, a.ud-btn, [role="button"]');
  
  for (const el of buttons) {
    const text = el.textContent.toLowerCase().trim();
    
    // Patterns TRÈS STRICTS pour "déjà inscrit" - le texte doit être EXACTEMENT celui-ci
    if (text === 'aller au cours' || 
        text === 'go to course' || 
        text === 'start course' ||
        text === 'commencer le cours' ||
        text === 'reprendre' ||
        text === 'continuer le cours' ||
        text === 'resume course') {
      console.log('✅ DÉJÀ INSCRIT détecté via bouton exact:', text);
      return true;
    }
  }
  
  // Méthode 3 : Vérifier l'URL - si on est sur /course/learning/ c'est qu'on est inscrit
  console.log('Méthode 3: Vérification URL...');
  if (window.location.href.includes('/course/learning/') || 
      window.location.href.includes('/course-taking/')) {
    console.log('✅ DÉJÀ INSCRIT détecté via URL');
    return true;
  }
  
 **
 * Vérifie si le cours est actuellement gratuit
 * Utilise plusieurs méthodes pour détecter le prix:
 * - Recherche de <span>Gratuit</span> ou <span>Free</span>
 * - Analyse des éléments de prix dans la page
 * - Vérification des boutons d'action
 * - Analyse du HTML brut
 * @returns {boolean} true si gratuit, false si payant ou indéterminé
 */');
  return false;
}

// Vérifier si le cours est gratuit
function checkIfFree() {
  console.log('🔍 === DÉBUT VÉRIFICATION PRIX ===');
  console.log('URL:', window.location.href);
  
  // Méthode prioritaire : Chercher spécifiquement <span>Gratuit</span> ou <span>Free</span>
  console.log('\n🎯 Méthode prioritaire: Recherche de <span>Gratuit</span>...');
  const spans = document.querySelectorAll('span');
  
  for (const span of spans) {
    const text = span.textContent.trim();
    const textLower = text.toLowerCase();
    
    // Vérifier que c'est un span simple avec juste le texte
    if (span.children.length === 0 && text.length < 20) {
      if (textLower === 'gratuit' || textLower === 'free') {
        console.log('✅✅✅ GRATUIT CONFIRMÉ via <span>:', text);
        return true;
      }
    }
  }
  
  // Méthode 1 : Chercher tous les éléments contenant un prix
  console.log('\n📊 Méthode 1: Recherche d\'éléments de prix...');
  const allElements = document.querySelectorAll('*');
  let foundPrice = null;
  let foundFree = false;
  
  for (const el of allElements) {
    const text = el.textContent;
    if (!text || text.length > 200) continue; // Ignorer les éléments trop longs
    
    const textLower = text.toLowerCase().trim();
    const textOriginal = text.trim();
    
    // Détection "Gratuit" ou "Free" - plus de patterns
    if (el.children.length === 0 || el.children.length === 1) { // Éléments feuilles ou quasi-feuilles
      if (textLower === 'gratuit' || textLower === 'free' || 
          textLower === '0,00 €' || textLower === '$0.00' || textLower === '0 €' ||
          textLower === 'free!' || textLower === 'gratuit!' ||
          textOriginal === '0,00\u00a0€' || textOriginal === '0\u00a0€') {
        console.log('✅ GRATUIT trouvé:', textLower, '(HTML:', textOriginal + ')');
        foundFree = true;
      }
    }
    
    // Détection d'un prix payant (chercher le pattern: nombre + symbole monétaire)
    // Gérer les espaces normaux ET insécables (\u00a0 = &nbsp;)
    const pricePatterns = [
      /(\d+[,\.]\d{2})[\s\u00a0]*€/i,
      /\$[\s\u00a0]*(\d+[,\.]\d{2})/i,
      /(\d+[,\.]\d{2})[\s\u00a0]*USD/i,
      /(\d+[,\.]\d{2})[\s\u00a0]*EUR/i,
      /£[\s\u00a0]*(\d+[,\.]\d{2})/i
    ];
    
    for (const pattern of pricePatterns) {
      const match = text.match(pattern);
      if (match && el.children.length <= 2) { // Éléments proches des feuilles
        const price = parseFloat(match[1].replace(',', '.'));
        if (price > 0 && (!foundPrice || price < foundPrice)) {
          foundPrice = price;
          console.log(`💰 Prix trouvé: ${match[0]} (valeur: ${price})`);
        }
      }
    }
  }
  
  // Méthode 2 : Analyser les boutons d'action
  console.log('\n🔘 Méthode 2: Analyse des boutons...');
  const buttons = document.querySelectorAll('button, a.btn, [role="button"]');
  
  for (const button of buttons) {
    const buttonText = button.textContent.toLowerCase().trim();
    
    if (buttonText.length > 0 && buttonText.length < 100) {
      console.log(`  Bouton: "${buttonText}"`);
      
      // Boutons indiquant un cours payant
      if (buttonText.includes('ajouter au panier') || 
          buttonText.includes('add to cart') ||
          buttonText.includes('acheter maintenant') ||
          buttonText.includes('buy now')) {
        console.log('❌ Bouton PAYANT détecté!');
        return false;
      }
      
      // Boutons indiquant un cours gratuit
      if ((buttonText.includes('s\'inscrire') || buttonText.includes('enroll')) &&
          (buttonText.includes('gratuit') || buttonText.includes('free'))) {
        console.log('✅ Bouton GRATUIT détecté!');
        foundFree = true;
      }
    }
  }
  
  // Méthode 3 : Analyse du HTML brut pour les data attributes
  console.log('\n🔍 Méthode 3: Analyse du HTML...');
  const htmlContent = document.body.innerHTML.toLowerCase();
  
  // Chercher des patterns de prix dans le HTML
  const htmlPricePatterns = [
    /"price"[:\s]*"?(\d+\.?\d*)"?/,
    /"amount"[:\s]*"?(\d+\.?\d*)"?/,
    /data-price="(\d+\.?\d*)"/
  ];
  
  for (const pattern of htmlPricePatterns) {
    const match = htmlContent.match(pattern);
    if (match) {
      const price = parseFloat(match[1]);
      if (price > 0) {
        console.log(`💰 Prix trouvé dans HTML: ${price}`);
        if (!foundPrice || price < foundPrice) {
          foundPrice = price;
        }
      }
    }
  }
  
  // Décision finale
  console.log('\n🎯 === DÉCISION FINALE ===');
  console.log(`Prix trouvé: ${foundPrice}`);
  console.log(`Gratuit trouvé: ${foundFree}`);
  
  if (foundPrice && foundPrice > 0) {
    console.log('❌ RÉSULTAT: PAYANT');
    return false;
 **
 * Trouve le bouton d'inscription sur la page Udemy
 * @returns {HTMLElement|null} Le bouton trouvé ou null
 */
  
  if (foundFree) {
    console.log('✅ RÉSULTAT: GRATUIT');
    return true;
  }
  
  // Par défaut, si rien n'est trouvé, considérer comme payant pour ne pas faire d'erreur
  console.log('⚠️ RÉSULTAT: INDÉTERMINÉ -> PAYANT par sécurité');
  return false;
}

// Trouver le bouton d'inscription
function findEnrollButton() {
  const buttonSelectors = [
    'button[data-purpose*="buy-this-course-button"]',
    'button[data-purpose*="add-to-cart"]',
    'button:contains("S\'inscrire maintenant")',
    'button:contains("Enroll now")',
    'button:contains("Ajouter au panier")',
    'button:contains("Add to cart")',
    '.buy-button',
    '[data-purpose="buy-button"]'
  ];
  
  for (const selector of buttonSelectors) {
    const button = document.querySelector(selector);
    if (button && button.offsetParent !== null) { // visible
      return button;
    }
  }
  
  // Chercher par texte
  const allButtons = document.querySelectorAll('button, a');
 **
 * Tente de s'inscrire au cours en cliquant sur le bouton d'inscription
 * Gère également le processus de checkout si nécessaire
 * @returns {boolean} true si l'inscription semble réussie, false sinon
 */ allButtons) {
    const text = button.textContent.toLowerCase();
    if ((text.includes('inscrire') || text.includes('enroll') || text.includes('ajouter au panier') || text.includes('add to cart')) &&
        button.offsetParent !== null) {
      return button;
    }
  }
  
  return null;
}

// S'inscrire au cours
async function enrollInCourse() {
  const enrollButton = findEnrollButton();
  
  if (!enrollButton) {
    console.error('Bouton d\'inscription non trouvé');
    return false;
  }
  
  try {
    // Scroller vers le bouton
    enrollButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Cliquer
    enrollButton.click();
    console.log('Clic sur le bouton d\'inscription');
    
    await sleep(500);
    
    // Vérifier si on est redirigé vers checkout
    if (window.location.href.includes('checkout') || window.location.href.includes('cart')) {
      console.log('Redirection vers checkout détectée');
      
      // Chercher le bouton de validation
      const checkoutButton = findCheckoutButton();
      
      if (checkoutButton) {
        checkoutButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
        checkoutButton.click();
        console.log('Commande validée');
      }
    }
    
    return true;
 **
 * Trouve le bouton de validation de commande sur la page de checkout
 * @returns {HTMLElement|null} Le bouton trouvé ou null
 */
  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);
    return false;
  }
}

// Trouver le bouton de checkout
function findCheckoutButton() {
  const selectors = [
    'button[data-purpose="checkout-button"]',
    'button:contains("Passer la commande")',
    'button:contains("Complete order")',
    'button:contains("Checkout")',
    '.checkout-button'
  ];
  
  for (const selector of selectors) {
    const button = document.querySelector(selector);
    if (button && button.offsetParent !== null) {
      return button;
    }
  }
  
  // Chercher par texte
  const allButtons = document.querySelectorAll('button');
  for (const button of allButtons) {
    const text = button.textContent.toLowerCase();
    if ((text.includes('passer') || text.includes('complete') || text.includes('checkout')) &&
        button.offsetParent !== null) {
 **
 * Fonction utilitaire pour créer un délai
 * @param {number} ms - Nombre de millisecondes à attendre
 * @returns {Promise<void>}
 */
    }
  }
  
  return null;
}

// Fonction utilitaire sleep
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

console.log('Udemy content script chargé');
