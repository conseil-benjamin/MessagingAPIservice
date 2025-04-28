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
const {initializeApp} = require("firebase-admin/app");

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

initializeApp()

exports.helloWorld = onRequest((request, response) => {
    logger.info("Hello logs!", {structuredData: true});
    response.send("Hello from Firebase!");
});

exports.sendFriendRequestNotification = onDocumentCreated("/users/{receiverId}/friends/{senderId}", async (event) => {
    const receiverId = event.params.receiverId;
    const senderId = event.params.senderId;
    const senderName = event?.data.data().senderName || "Un utilisateur";

    console.log(`Nouvelle demande d’ami de ${senderId} à ${receiverId}`);
    const data = event.data.data(); // Récupération des données du document
    console.log("Data:", data);

    if (data.isRequest) {
        console.log(`La demande d’ami de ${senderId} à ${receiverId} n’est pas explicite.`);
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
                //click_action: "com.example.dreamary.FRIEND_REQUEST"
            },
            data: {
                click_action: "com.example.dreamary.FRIEND_REQUEST",
            },
            token: fcmToken,
        };

        // Envoyer la notification
        const response = await admin.messaging().send(payload);
        console.log(`Notification envoyée à ${receiverId}`, response);
        return response;

    } catch (error) {
        console.error("Erreur lors de l’envoi de la notification :", error);
    }
});
