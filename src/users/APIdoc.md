# Documentation de l'API `users_management`

Ce document décrit les fonctionnalités exposées par l'API Django `users_management` du projet **ft_transcendence**, incluant les endpoints disponibles, leurs usages, et les données associées.

---

## Table des matières

1. [Introduction](#introduction)
2. [Fonctionnalités principales](#fonctionnalités-principales)
3. [Structure des modèles](#structure-des-modèles)
4. [Endpoints de l'API](#endpoints-de-lapi)
    - [Authentification](#authentification)
    - [Gestion des utilisateurs](#gestion-des-utilisateurs)
    - [Amis et relations sociales](#amis-et-relations-sociales)
5. [Exemples de requêtes](#exemples-de-requêtes)
6. [Notes supplémentaires](#notes-supplémentaires)

---

## Introduction

L'application Django `users_management` gère les aspects liés aux utilisateurs dans le projet ft_transcendence.  
Elle offre des fonctionnalités telles que l'inscription, la connexion, la gestion des profils et des relations d'amitié entre utilisateurs.

---

## Fonctionnalités principales
  
- **Gestion des utilisateurs** :
  - Création et mise à jour des profils utilisateurs.
  - Liste des utilisateurs enregistrés.
  - Détail d'un utilisateur spécifique.
  
- **Relations sociales** :
  - Ajouter des amis.
  - Afficher la liste d'amis.
  - Retirer un ami.
  - Bloquer un utilisateur.

---

## Structure des modèles

### Modèle `User`

Le modèle `User` représente les utilisateurs de l'application. Il est basé sur `AbstractBaseUser` et inclut des champs personnalisés ainsi que des fonctionnalités standard de gestion des utilisateurs.

| Champ            | Type                | Description                              |
|------------------|---------------------|------------------------------------------|
| `id`             | `Integer`           | Identifiant unique de l'utilisateur.     |
| `username`       | `String`            | Nom d'utilisateur (unique).              |
| `password`       | `String`            | Mot de passe hashé.                      |
| `email`          | `String`            | Adresse mail unique de l'utilisateur.    |
| `avatar`         | `ImageField`        | Chemin vers l'image d'avatar.            |
| `status`         | `String`            | Statut (en ligne, hors ligne, en partie).|
| `blocked_users`  | `ManyToManyField`   | Liste des utilisateurs bloqués.          |

#### Statuts possibles (`STATUS_CHOICES`)
- **`online`** : L'utilisateur est en ligne.
- **`offline`** : L'utilisateur est hors ligne.
- **`in_game`** : L'utilisateur est en partie.

#### Champs d'authentification
- **`USERNAME_FIELD`** : Définit le champ `username` comme identifiant principal pour l'authentification.
- **`REQUIRED_FIELDS`** : Spécifie que le mot de passe est requis lors de la création d'un utilisateur.

#### Méthodes principales
- **`__str__`** : Retourne le nom d'utilisateur sous forme de chaîne de caractères.
- **`UserManager`** : Fournit des méthodes personnalisées pour gérer les utilisateurs (par exemple, création d'utilisateurs ou d'administrateurs).

#### Relations
- **Relation bloquée** : Les utilisateurs peuvent bloquer d'autres utilisateurs via une relation asymétrique (`blocked_users`).

#### Contraintes et validations
- Les noms d'utilisateur doivent être uniques et contenir au moins 3 caractères.
- Les mots de passe doivent contenir au moins 5 caractères. Il est recommandé d'utiliser `set_password()` pour les sécuriser avant leur stockage.
- L'email, s'il est fourni, doit être unique.

#### Exemple d'objet User
```json
{
  "username": "johndoe",
  "password": "hashed_password_here",
  "email": "johndoe@example.com",
  "avatar": "avatars/johndoe.png",
  "status": "online",
  "blocked_users": [2, 3],
  "is_active": true,
  "is_staff": false,
  "is_superuser": false
}
```

---

### Modèle `Relationship`

Le modèle `Relationship` représente les relations entre deux utilisateurs dans l'application. Chaque relation est définie par un utilisateur initiateur (`from_user`), un utilisateur destinataire (`to_user`) et un statut décrivant la nature de la relation.

| Champ            | Type                | Description                                                     |
|------------------|---------------------|-----------------------------------------------------------------|
| `id`             | `Integer`           | Identifiant unique de la relation.                              |
| `from_user`      | `ForeignKey`        | Référence à l'utilisateur initiateur de la relation.            |
| `to_user`        | `ForeignKey`        | Référence à l'utilisateur destinataire de la relation.          |
| `status`         | `CharField`         | Statut de la relation. Peut être `pending`, `friend` ou `none`. |
| `created at`     | `DateTimeField`     | Date et heure de création de la relation.                       |

#### Statuts possibles (`RELATIONSHIP_CHOICES`)
- **`pending`** : Une demande d'ami est en attente.
- **`friend`** : Les deux utilisateurs sont amis.
- **`none`** : Aucune relation active n'existe entre les utilisateurs.

#### Contraintes et validations
- Une relation doit être unique pour une combinaison spécifique de `from_user` et `to_user`.
- Un utilisateur ne peut pas établir de relation avec lui-même.
- La contrainte d'unicité est définie dans la classe `Meta` via `unique_together = ('from_user', 'to_user')`.
- La méthode `clean` lève une exception si `from_user` et `to_user` sont identiques.

#### Méthodes principales
- **`__str__`** : Retourne une représentation textuelle de la relation, par exemple : `user1 -> user2 (friend)`.

#### Exemple d'objet Relationship
```json
{
  "from_user": 1,
  "to_user": 2,
  "status": "pending",
  "created_at": "2024-11-19T12:34:56Z"
}
```

---

## Endpoints de l'API

### Gestion des utilisateurs

1. **Liste des utilisateurs**
   - **URL** : `/api/v1/users/users/`
   - **Méthode** : `GET`
   - **Réponse** :
     ```json
     [
       {
         "id": 1,
         "username": "JohnDoe",
         "status": "online",
         "avatar": "avatars/johndoe.png"
       },
       ...
     ]
     ```

2. **Détails d'un utilisateur**
   - **URL** : `/api/v1/users/users/<id>/`
   - **Méthode** : `GET`
   - **Réponse** :
     ```json
     {
       "id": 1,
       "username": "JohnDoe",
       "status": "online",
       "avatar": "avatars/johndoe.png",
       "friends": [2, 3, 4]
     }
     ```

3. **Créer un utilisateur**
   - **URL** : `/api/v1/users/users/`
   - **Méthode** : `POST`
   - **Corps de la requête** :
     ```json
     {
       "username": "nouveauUtilisateur",
       "password": "motdepasse",
       "avatar": "base64string_image"
     }
     ```
   - **Réponse** :
     ```json
     {
       "id": 2,
       "username": "nouveauUtilisateur",
       "status": "offline",
       "avatar": "avatars/nouveauUtilisateur.png"
     }
     ```

---

### Amis et relations sociales

1. **Inviter un ami**
   - **URL** : `/api/v1/users/relationships/<id>/add_friend/`
   - **Méthode** : `POST`
   - **Réponse** :
     ```json
     {
       "message": "Demande d'ami envoyée.",
       "friends": [1, 3, 4]
     }
     ```

1. **Accepter une invitaion**
   - **URL** : `/api/v1/users/relationships/<id>/accept_friend/`
   - **Méthode** : `POST`
   - **Réponse** :
     ```json
     {
       "message": "Demande d'ami acceptée.",
       "friends": [1, 3, 4]
     }
     ```

3. **Supprimer un ami**
   - **URL** : `/api/v1/users/relationships/<id>/remove_friend/`
   - **Méthode** : `POST`
   - **Réponse** :
     ```json
     {
       "message": "Ami supprimé.",
       "friends": [1, 4]
     }
     ```

---

## Exemples de requêtes

### Requête pour récupérer tous les utilisateurs

```bash
curl -X GET http://localhost/users_api/users/ \
-H "Authorization: Bearer <token_jwt>"
```