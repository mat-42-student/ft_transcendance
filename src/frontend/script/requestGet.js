// URL de l'API qui gère la création d'utilisateur


// Données utilisateur à envoyer
export async function sendGetRequest(){

    const url = 'https://localhost:3000/api/soloq/';  // Remplacez par l'URL correcte de votre API
    const userData = {
        type: "2P"
    };

    // Requête POST pour créer un objet User
    await fetch(url, {
        method: 'POST',  // Méthode HTTP
        headers: {
            'Content-Type': 'application/json',  // Envoi des données en JSON
        },
        body: JSON.stringify(userData)  // Conversion des données en format JSON
    })
    .then(response => {
        if (!response.ok) {
            // Gérer les erreurs de la réponse si le statut HTTP n'est pas 200-299
            return response.json().then(errData => {
                throw new Error(`Erreur : ${errData}`);
            });
        }
        return response.json();  // Conversion de la réponse en JSON
    })
    .then(data => {
        console.log('Utilisateur créé avec succès:', data);  // Réponse si succès
    })
    .catch(error => {
        console.error('Erreur lors de la création de l\'utilisateur:', error);  // Afficher les erreurs
    });
}

// Envoyer la requête POST dès que la page est prête
//document.addEventListener('DOMContentLoaded', function() {
 //   sendPostRequest();  // Appel de la fonction dès que le DOM est prêt
//});