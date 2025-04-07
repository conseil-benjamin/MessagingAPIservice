/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const {onDocumentCreated} = require("firebase-functions/firestore");

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

exports.helloWorld = onRequest((request, response) => {
    logger.info("Hello logs!", {structuredData: true});
    response.send("Hello from Firebase!");
});

exports.sendFriendRequestNotification = onDocumentCreated("/users/{receiverId}/friends/{senderId}", async (event) => {
    const snap = event.data.data();
    const request = snap.data();
    const receiverId = event.params.receiverId;
    const senderId = event.params.senderId;
    const senderName = request.senderName;

    console.log(`Nouvelle demande d’ami de ${senderId} à ${receiverId}`);

    if (!request.isRequest) {
        console.log("Document créé sans demande d’ami explicite. Ignoré.");
        return;
    }

    try {
        // Récupération du token FCM de l'utilisateur destinataire
        const userDoc = await admin.firestore().collection("users").doc(receiverId).get();
        if (!userDoc.exists) {
            console.log(`Utilisateur ${receiverId} introuvable.`);
            return;
        }

        const fcmToken = userDoc.data().tokenFcm;

        if (!fcmToken) {
            console.log(`Pas de token FCM pour l'utilisateur ${receiverId}.`);
            return;
        }

        // Préparer la notification
        const payload = {
            notification: {
                title: "Nouvelle demande d’ami 💌",
                body: `${senderName} t’a envoyé une demande d’ami.`,
                // clickAction: 'FLUTTER_NOTIFICATION_CLICK', // ou ton intent personnalisé
            },
            token: fcmToken,
        };

        // Envoyer la notification
        const response = await admin.messaging().send(payload);
        console.log(`Notification envoyée à ${receiverId}`, response);

    } catch (error) {
        console.error("Erreur lors de l’envoi de la notification :", error);
    }
});
