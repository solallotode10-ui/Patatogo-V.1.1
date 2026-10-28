# Patatogo : mise en ligne

Le dossier contient le jeu joueur (`index.html`), l’admin séparé (`admin.html`), la base de données (`supabase.sql`) et les fichiers de l’app installable.

## 1. Supabase (comptes + base de données)
1. Crée un projet gratuit sur supabase.com.
2. Ouvre **SQL Editor**, colle tout `supabase.sql`, clique **Run**.
3. **Authentication > Providers > Email** : désactive « Confirm email » si tu veux que les joueurs entrent directement après l’inscription.
4. **Project Settings > API** : copie l’URL et la clé `anon public`, puis colle-les dans `config.js`.

## 2. Vercel
1. Mets le dossier dans un dépôt GitHub (ou utilise `npx vercel` dans le dossier).
2. Sur vercel.com : **Add New > Project**, importe le dépôt.
3. Framework Preset : **Other**. Pas de commande de build, pas de dossier de sortie. Clique **Deploy**.

## 3. Devenir admin
1. Ouvre ton site, **Créer un compte** avec ton email.
2. Dans Supabase > SQL Editor, lance :
   `insert into public.admins (user_id) select id from auth.users where email = 'ton@email.com';`
3. Va sur `ton-site.vercel.app/admin`, connecte-toi, ajoute tes cartes, raretés et paquets. Tout est publié automatiquement pour les joueurs.

Conseil : renomme `admin.html` avec un nom difficile à deviner (par exemple `gestion-k29x.html`). La vraie protection est la base de données : sans être dans la table `admins`, personne ne peut modifier les cartes.

## 4. Installer l’app
Après la connexion, le joueur voit « Télécharger l’app ». Sur Android (Chrome) un clic installe l’app. Sur iPhone, une fenêtre explique les étapes (Partager, puis Sur l’écran d’accueil).

## Limites connues
- Les chips coins et les cartes sont enregistrés par l’app du joueur : un joueur qui sait programmer peut tricher. Pour bloquer ça, il faudra déplacer les achats et les tirages dans des fonctions côté serveur.
- Les amis, clubs et marché se mettent à jour toutes les 6 à 10 secondes (pas en temps réel).
- Les images des cartes sont stockées dans la base. Au-delà de quelques centaines de cartes, il vaudra mieux les mettre dans Supabase Storage.
