// Script de seed : crée des comptes test + un match de démo
// Lancer avec : node seed.js
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Match = require('./models/Match');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connecté à MongoDB pour le seed');

  // Nettoyage optionnel (décommenter si tu veux repartir de zéro à chaque fois)
  // await User.deleteMany({});
  // await Match.deleteMany({});

  const joueursTest = [
    { pseudo: 'Léo_10', avatar: '⚽', posteFavori: 'Attaquant', niveau: 'Bon', quartier: 'La Rochelle', dispo: { actif: true, jusqua: new Date(Date.now() + 3 * 3600 * 1000), lieu: 'City stade' } },
    { pseudo: 'Yanis_G', avatar: '🧤', posteFavori: 'Gardien', niveau: 'Confirmé', quartier: 'La Rochelle', dispo: { actif: true, jusqua: new Date(Date.now() + 2 * 3600 * 1000), lieu: '' } },
    { pseudo: 'Sacha_D', avatar: '🛡️', posteFavori: 'Défenseur', niveau: 'Moyen', quartier: 'La Rochelle', dispo: { actif: false } },
    { pseudo: 'Nino_M', avatar: '🎯', posteFavori: 'Milieu', niveau: 'Débutant', quartier: 'La Rochelle', dispo: { actif: true, jusqua: new Date(Date.now() + 5 * 3600 * 1000), lieu: 'Terrain lycée' } }
  ];

  const utilisateursCrees = [];
  for (const data of joueursTest) {
    const existant = await User.findOne({ pseudo: data.pseudo });
    if (existant) {
      utilisateursCrees.push(existant);
      console.log(`ℹ️  ${data.pseudo} existe déjà, réutilisé.`);
      continue;
    }
    const user = await User.create(data);
    utilisateursCrees.push(user);
    console.log(`👤 Compte créé : ${user.pseudo} (id: ${user._id})`);
  }

  // Créer un match de démo avec le premier joueur comme créateur
  const createur = utilisateursCrees[0];
  const matchExistant = await Match.findOne({ lieu: 'City stade Bellecour' });
  if (!matchExistant) {
    const match = await Match.create({
      createur: createur._id,
      lieu: 'City stade Bellecour',
      dateHeure: new Date(Date.now() + 24 * 3600 * 1000), // demain
      nbJoueursRecherches: 10,
      niveauSouhaite: 'Tous niveaux',
      joueursInscrits: [utilisateursCrees[0]._id, utilisateursCrees[1]._id]
    });
    console.log(`⚽ Match de démo créé (id: ${match._id})`);
  } else {
    console.log('ℹ️  Match de démo déjà présent.');
  }

  console.log('\n--- Pour te connecter à un compte test ---');
  console.log('Ouvre la console du navigateur sur la page de l\'appli et tape :');
  console.log(`localStorage.setItem('onze_user_id', '${utilisateursCrees[0]._id}');`);
  console.log('Puis recharge la page. Tu seras connecté en tant que Léo_10.\n');

  await mongoose.disconnect();
  console.log('✅ Seed terminé.');
}

seed().catch(err => {
  console.error('❌ Erreur pendant le seed :', err.message);
  process.exit(1);
});
