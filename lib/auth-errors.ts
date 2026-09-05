import { FirebaseError } from "firebase/app";

const messages: Record<string, string> = {
  "auth/email-already-in-use": "Вече има акаунт с този имейл.",
  "auth/invalid-credential": "Грешен имейл или парола.",
  "auth/invalid-email": "Невалиден имейл адрес.",
  "auth/popup-blocked": "Браузърът блокира Google прозореца.",
  "auth/popup-closed-by-user": "Google входът беше прекратен.",
  "auth/too-many-requests": "Твърде много опити. Опитайте отново по-късно.",
  "auth/weak-password": "Паролата е прекалено слаба.",
};

export function authErrorMessage(error: unknown) {
  if (error instanceof FirebaseError) {
    return messages[error.code] ?? "Неуспешна автентикация. Опитайте отново.";
  }
  return error instanceof Error ? error.message : "Възникна неочаквана грешка.";
}
