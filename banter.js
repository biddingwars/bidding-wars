/* ============================================================================
   banter.js — the rival's one-liners when it drops out or wins a lot, per
   language. Shared by every pack (item-specific taunts live in the packs).
   ========================================================================== */
(function (root) {
  const banter = {
 "en": {
  "pass": [
   "I refuse to be robbed in public. It is yours.",
   "Enjoy it. I shall enjoy my remaining budget more.",
   "At that price it becomes your mistake, not mine.",
   "Fine. Overpay. I will be waiting at the next lot.",
   "I withdraw with dignity. You proceed without it.",
   "You won a battle. I am winning the evening.",
   "That was the trap. You walked in and paid for it.",
   "Take it. I priced it properly and you did not.",
   "I decline. Somebody in this room has standards.",
   "Congratulations on your expensive little victory.",
   "I could go higher. I simply refuse to reward you.",
   "Yours. And so is the regret."
  ],
  "win": [
   "Filed under things you cannot afford.",
   "Another one for the collection. Do keep trying.",
   "That is how it is done. Watch and learn.",
   "Bought, paid, and already forgotten. Next.",
   "You had every chance. You used none of them.",
   "I win these quietly and often.",
   "Thank you for driving the price up for me.",
   "A fine addition. My shelf grows heavy.",
   "Predictable. Satisfying. Mine.",
   "You bid. I collected. That is the arrangement.",
   "Add it to the empire.",
   "I did warn you."
  ]
 },
 "de": {
  "pass": [
   "Ich lasse mich nicht in aller Öffentlichkeit ausrauben. Gehört dir.",
   "Viel Spaß damit. Ich habe mehr Spaß an meinem Restbudget.",
   "Zu dem Preis ist es dein Fehler, nicht meiner.",
   "Gut. Zahl zu viel. Ich warte beim nächsten Los.",
   "Das war die Falle. Du bist reingelaufen und hast bezahlt.",
   "Ich könnte höher gehen. Ich will dich nur nicht belohnen."
  ],
  "win": [
   "Abgelegt unter: Dinge, die du dir nicht leisten kannst.",
   "Noch eins für die Sammlung. Versuch es ruhig weiter.",
   "So macht man das. Schau zu und lerne.",
   "Danke, dass du den Preis für mich hochgetrieben hast.",
   "Du hattest jede Gelegenheit. Genutzt hast du keine.",
   "Ab damit ins Imperium."
  ]
 },
 "it": {
  "pass": [
   "Non mi faccio derubare in pubblico. È tuo.",
   "Divertiti. Io mi diverto di più col budget che mi resta.",
   "A quel prezzo l’errore è tuo, non mio.",
   "Va bene. Paga troppo. Ti aspetto al prossimo lotto.",
   "Era una trappola. Ci sei entrato e hai pagato.",
   "Potrei salire ancora. Solo non voglio premiarti."
  ],
  "win": [
   "Archiviato tra le cose che non puoi permetterti.",
   "Un altro per la collezione. Continua pure a provarci.",
   "Si fa così. Guarda e impara.",
   "Grazie per aver alzato il prezzo per me.",
   "Hai avuto ogni occasione. Non ne hai usata nessuna.",
   "Aggiungilo all’impero."
  ]
 },
 "es": {
  "pass": [
   "No pienso dejar que me roben en público. Es tuyo.",
   "Disfrútalo. Yo disfrutaré más de lo que me queda.",
   "A ese precio el error es tuyo, no mío.",
   "Bien. Paga de más. Te espero en el siguiente lote.",
   "Era la trampa. Entraste y pagaste.",
   "Podría subir más. Simplemente no quiero premiarte."
  ],
  "win": [
   "Archivado entre las cosas que no puedes permitirte.",
   "Otro para la colección. Sigue intentándolo.",
   "Así se hace. Mira y aprende.",
   "Gracias por subirme el precio.",
   "Tuviste todas las oportunidades. No usaste ninguna.",
   "Añádelo al imperio."
  ]
 },
 "fr": {
  "pass": [
   "Je refuse de me faire voler en public. Il est à toi.",
   "Profites-en. Je profiterai davantage de ce qui me reste.",
   "À ce prix-là, l’erreur est la tienne, pas la mienne.",
   "Très bien. Paie trop cher. Je t’attends au lot suivant.",
   "C’était le piège. Tu es entré et tu as payé.",
   "Je pourrais monter. Je refuse simplement de te récompenser."
  ],
  "win": [
   "Classé parmi les choses que tu ne peux pas te payer.",
   "Encore un pour la collection. Continue d’essayer.",
   "Voilà comment on fait. Regarde et apprends.",
   "Merci d’avoir fait monter le prix pour moi.",
   "Tu as eu toutes tes chances. Tu n’en as saisi aucune.",
   "Ajouté à l’empire."
  ]
 }
};
  if (typeof module === 'object' && module.exports) module.exports = banter;
  else root.Banter = banter;
})(typeof self !== 'undefined' ? self : this);
