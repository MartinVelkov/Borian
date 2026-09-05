"use client";

import {
  useCallback,
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  createUserWithEmailAndPassword,
  getRedirectResult,
  GoogleAuthProvider,
  sendEmailVerification,
  signInWithPopup,
  signInWithRedirect,
  updateProfile,
  type User as FirebaseUser,
} from "firebase/auth";

import {
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";

import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Camera,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  Trophy,
  User,
  Users,
} from "lucide-react";

import { auth, db, storage } from "@/lib/firebase";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import logo from "../bulgarian-street-sports-logo.jpg";

export default function RegisterPage() {
  const router = useRouter();

  /* ====================================================== */
  /* FORM STATE                                             */
  /* ====================================================== */

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [photoFile, setPhotoFile] =
    useState<File | null>(null);

  const [photoPreview, setPhotoPreview] =
    useState<string | null>(null);

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] =
    useState(false);
  const [photoUploading, setPhotoUploading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  /* ====================================================== */
  /* IMAGE CLEANUP                                          */
  /* ====================================================== */

  useEffect(() => {
    return () => {
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  /* ====================================================== */
  /* PHOTO UPLOAD                                           */
  /* ====================================================== */

  const uploadProfilePhoto = useCallback(
    async (userId: string, file: File) => {
      setPhotoUploading(true);

      try {
        const photoRef = ref(
          storage,
          `players/${userId}/${Date.now()}-${file.name}`
        );

        await uploadBytes(photoRef, file);

        return await getDownloadURL(photoRef);
      } finally {
        setPhotoUploading(false);
      }
    },
    []
  );

  /* ====================================================== */
  /* GOOGLE USER FINALIZATION                               */
  /* ====================================================== */

  const finalizeGoogleUser = useCallback(
    async (
      user: FirebaseUser,
      options?: {
        birthDate?: string;
        photoFile?: File | null;
      }
    ) => {
      const playerRef = doc(
        db,
        "players",
        user.uid
      );

      const playerSnap =
        await getDoc(playerRef);

      let photoURL =
        user.photoURL ?? null;

      if (options?.photoFile) {
        photoURL =
          await uploadProfilePhoto(
            user.uid,
            options.photoFile
          );
      }

      if (playerSnap.exists()) {
        await setDoc(
          playerRef,
          {
            birthDate:
              options?.birthDate || null,
            photoURL,
            updatedAt:
              serverTimestamp(),
          },
          {
            merge: true,
          }
        );

        router.push("/dashboard");
        return;
      }

      await setDoc(playerRef, {
        uid: user.uid,

        firstName: "",
        lastName: "",

        displayName:
          user.displayName ?? "",

        email:
          user.email ?? "",

        phone: "",

        birthDate:
          options?.birthDate || null,

        photoURL,

        role: "player",

        authProviders:
          user.providerData.map(
            (item) => item.providerId
          ),

        profileCompleted: false,

        emailVerified:
          user.emailVerified,

        phoneVerified: false,

        createdAt:
          serverTimestamp(),

        updatedAt:
          serverTimestamp(),
      });

      router.push("/dashboard");
    },
    [router, uploadProfilePhoto]
  );

  /* ====================================================== */
  /* GOOGLE REDIRECT RESULT                                 */
  /* ====================================================== */

  useEffect(() => {
    let cancelled = false;

    void getRedirectResult(auth)
      .then(async (result) => {
        if (
          cancelled ||
          !result?.user
        ) {
          return;
        }

        await finalizeGoogleUser(
          result.user
        );
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }

        console.error(err);

        setError(
          mapGoogleError(err)
        );
      });

    return () => {
      cancelled = true;
    };
  }, [finalizeGoogleUser]);

  /* ====================================================== */
  /* PHOTO SELECTION                                        */
  /* ====================================================== */

  function handlePhotoSelection(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (photoPreview) {
      URL.revokeObjectURL(
        photoPreview
      );
    }

    if (!file) {
      setPhotoFile(null);
      setPhotoPreview(null);
      return;
    }

    if (
      !file.type.startsWith(
        "image/"
      )
    ) {
      setError(
        "Моля, изберете изображение."
      );

      return;
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      setError(
        "Снимката трябва да бъде под 5 MB."
      );

      return;
    }

    setError(null);

    setPhotoFile(file);

    setPhotoPreview(
      URL.createObjectURL(file)
    );
  }

  /* ====================================================== */
  /* EMAIL REGISTRATION                                     */
  /* ====================================================== */

  async function handleRegister(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError(null);

    if (!firstName.trim()) {
      setError(
        "Моля, въведете име."
      );
      return;
    }

    if (!lastName.trim()) {
      setError(
        "Моля, въведете фамилия."
      );
      return;
    }

    if (!phone.trim()) {
      setError(
        "Моля, въведете телефонен номер."
      );
      return;
    }

    if (!email.trim()) {
      setError(
        "Моля, въведете имейл."
      );
      return;
    }

    if (password.length < 6) {
      setError(
        "Паролата трябва да бъде поне 6 символа."
      );
      return;
    }

    if (
      password !==
      confirmPassword
    ) {
      setError(
        "Паролите не съвпадат."
      );
      return;
    }

    const maxBirthDate = (() => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 3);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
})();

    try {
      setLoading(true);

      /* Firebase Authentication */

      const credential =
        await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );

      const user =
        credential.user;

      const displayName =
        `${firstName.trim()} ${lastName.trim()}`;

      /* Auth profile */

      await updateProfile(user, {
        displayName,
      });

      /* Photo */

      let photoURL:
        | string
        | null = null;

      if (photoFile) {
        photoURL =
          await uploadProfilePhoto(
            user.uid,
            photoFile
          );
      }

      /* Firestore player */

      await setDoc(
        doc(
          db,
          "players",
          user.uid
        ),
        {
          uid:
            user.uid,

          firstName:
            firstName.trim(),

          lastName:
            lastName.trim(),

          displayName,

          email:
            user.email,

          phone:
            phone.trim(),

          birthDate:
            birthDate || null,

          photoURL,

          role:
            "player",

          authProviders: [
            "password",
          ],

          profileCompleted:
            true,

          emailVerified:
            user.emailVerified,

          phoneVerified:
            false,

          createdAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp(),
        }
      );

      /* Verification */

      await sendEmailVerification(
        user
      );

      router.push(
        "/dashboard"
      );
    } catch (err: any) {
      console.error(err);

      switch (err?.code) {
        case "auth/email-already-in-use":
          setError(
            "Вече съществува акаунт с този имейл."
          );
          break;

        case "auth/invalid-email":
          setError(
            "Невалиден имейл адрес."
          );
          break;

        case "auth/weak-password":
          setError(
            "Паролата е прекалено слаба."
          );
          break;

        default:
          setError(
            "Възникна грешка при регистрацията. Моля, опитайте отново."
          );
      }
    } finally {
      setLoading(false);
    }
  }

  /* ====================================================== */
  /* GOOGLE                                                 */
  /* ====================================================== */

  async function handleGoogleRegister() {
    try {
      setGoogleLoading(true);
      setError(null);

      const provider =
        new GoogleAuthProvider();

      provider.setCustomParameters({
        prompt:
          "select_account",
      });

      try {
        const credential =
          await signInWithPopup(
            auth,
            provider
          );

        await finalizeGoogleUser(
          credential.user,
          {
            birthDate,
            photoFile,
          }
        );
      } catch (err: any) {
        if (
          err?.code ===
          "auth/popup-blocked"
        ) {
          await signInWithRedirect(
            auth,
            provider
          );

          return;
        }

        throw err;
      }
    } catch (err: unknown) {
      console.error(err);

      setError(
        mapGoogleError(err)
      );
    } finally {
      setGoogleLoading(false);
    }
  }

  const busy =
    loading ||
    googleLoading ||
    photoUploading;

  /* ====================================================== */
  /* PAGE                                                   */
  /* ====================================================== */

  return (
    <main className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      {/* ================================================= */}
      {/* NAVIGATION                                        */}
      {/* ================================================= */}

      <header className="sticky top-0 z-50 border-b border-black/[0.04] bg-white/80 backdrop-blur-2xl">
        <div className="mx-auto flex h-[64px] max-w-[1200px] items-center justify-between px-5 md:px-8">
          <Link
            href="/"
            className="flex items-center gap-3"
          >
            <Image
              src={logo}
              alt="Bulgarian Street Sports"
              width={40}
              height={40}
              priority
              className="h-9 w-9 object-contain"
            />

            <div className="hidden leading-none sm:block">
              <p className="text-[13px] font-semibold tracking-tight">
                Bulgarian Street Sports
              </p>

              <p className="mt-1 text-[11px] text-black/45">
                Player registration
              </p>
            </div>
          </Link>

          <Link
            href="/"
            className="group flex items-center gap-1.5 text-[13px] font-medium text-[#0066cc]"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />

            Турнири
          </Link>
        </div>
      </header>

      {/* ================================================= */}
      {/* MAIN CONTENT                                      */}
      {/* ================================================= */}

      <div className="mx-auto grid max-w-[1400px] lg:min-h-[calc(100vh-64px)] lg:grid-cols-[0.9fr_1.1fr]">
        {/* ================================================= */}
        {/* LEFT BRAND PANEL                                  */}
        {/* ================================================= */}

        <section className="relative hidden overflow-hidden bg-black px-12 py-16 text-white lg:flex lg:flex-col lg:justify-between xl:px-20 xl:py-20">
          {/* BACKGROUND GLOW */}

          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-[180px] top-[8%] h-[520px] w-[520px] rounded-full bg-blue-500/20 blur-[150px]" />

            <div className="absolute -bottom-[220px] right-[-120px] h-[600px] w-[600px] rounded-full bg-orange-500/25 blur-[160px]" />
          </div>

          {/* LOGO */}

          <div className="relative">
            <div className="flex h-[86px] w-[86px] items-center justify-center overflow-hidden rounded-[24px] bg-white shadow-[0_25px_70px_rgba(255,255,255,0.08)]">
              <Image
                src={logo}
                alt="Bulgarian Street Sports"
                width={78}
                height={78}
                className="h-[76px] w-[76px] object-contain"
              />
            </div>
          </div>

          {/* BRAND CONTENT */}

          <div className="relative max-w-[570px] py-16">
            <p className="mb-5 text-[15px] font-semibold text-[#f5a623]">
              Bulgarian Street Sports
            </p>

            <h1 className="text-[58px] font-semibold leading-[0.98] tracking-[-0.055em] xl:text-[72px]">
              Твоят профил.
              <br />

              <span className="text-white/45">
                Твоята игра.
              </span>
            </h1>

            <p className="mt-8 max-w-[510px] text-[19px] font-medium leading-[1.5] tracking-[-0.015em] text-white/55">
              Един профил за всички
              3x3 футболни и
              баскетболни турнири.
            </p>

            {/* BENEFITS */}

            <div className="mt-12 grid gap-4">
              <Feature
                icon={
                  <Trophy />
                }
                title="Участвай в турнири"
                description="Записвай се директно за предстоящите събития."
              />

              <Feature
                icon={
                  <Users />
                }
                title="Изгради своя профил"
                description="Твоят играчки профил остава с теб във всеки турнир."
              />

              <Feature
                icon={
                  <ShieldCheck />
                }
                title="Следи развитието си"
                description="Резултати, участия и статистика на едно място."
              />
            </div>
          </div>

          <p className="relative text-[12px] text-white/30">
            ©{" "}
            {new Date().getFullYear()}{" "}
            Bulgarian Street Sports
          </p>
        </section>

        {/* ================================================= */}
        {/* REGISTER SIDE                                     */}
        {/* ================================================= */}

        <section className="relative flex justify-center bg-[#f5f5f7] px-5 py-12 sm:px-8 md:py-16 lg:px-12 xl:px-20">
          {/* MOBILE INTRO */}

          <div className="w-full max-w-[620px]">
            <div className="mb-10 lg:hidden">
              <div className="mb-8 flex h-[76px] w-[76px] items-center justify-center overflow-hidden rounded-[22px] bg-white shadow-[0_15px_40px_rgba(0,0,0,0.07)]">
                <Image
                  src={logo}
                  alt="Bulgarian Street Sports"
                  width={68}
                  height={68}
                  className="h-[66px] w-[66px] object-contain"
                />
              </div>

              <h1 className="text-[44px] font-semibold leading-[1] tracking-[-0.045em]">
                Създай своя
                <br />
                играчки профил.
              </h1>

              <p className="mt-5 max-w-[450px] text-[17px] leading-relaxed text-[#6e6e73]">
                Регистрирай се за
                турнири и следи
                развитието си.
              </p>
            </div>

            {/* DESKTOP HEADER */}

            <div className="mb-10 hidden lg:block">
              <p className="mb-3 text-[14px] font-semibold text-[#f56300]">
                Нов играч
              </p>

              <h2 className="text-[46px] font-semibold leading-[1] tracking-[-0.045em] xl:text-[52px]">
                Създай профил.
              </h2>

              <p className="mt-4 text-[17px] leading-relaxed text-[#6e6e73]">
                Отнема само няколко
                минути.
              </p>
            </div>

            {/* ================================================= */}
            {/* GOOGLE                                            */}
            {/* ================================================= */}

            <button
              type="button"
              onClick={
                handleGoogleRegister
              }
              disabled={busy}
              className="group flex h-[56px] w-full items-center justify-center rounded-[16px] bg-white px-5 text-[15px] font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.06] transition-all duration-300 hover:bg-[#fafafa] hover:shadow-[0_6px_20px_rgba(0,0,0,0.06)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {googleLoading ? (
                <Loader2 className="mr-3 h-5 w-5 animate-spin" />
              ) : (
                <GoogleIcon />
              )}

              Продължи с Google
            </button>

            {/* DIVIDER */}

            <div className="my-9 flex items-center gap-4">
              <div className="h-px flex-1 bg-black/[0.08]" />

              <span className="text-[12px] font-medium uppercase tracking-[0.08em] text-[#86868b]">
                или
              </span>

              <div className="h-px flex-1 bg-black/[0.08]" />
            </div>

            {/* ================================================= */}
            {/* FORM                                              */}
            {/* ================================================= */}

            <form
              onSubmit={
                handleRegister
              }
              className="space-y-7"
            >
              {/* NAME */}

              <div>
                <SectionTitle>
                  Лична информация
                </SectionTitle>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <AppleInput
                    id="firstName"
                    label="Име"
                    placeholder="Иван"
                    value={
                      firstName
                    }
                    onChange={(e) =>
                      setFirstName(
                        e.target.value
                      )
                    }
                    disabled={busy}
                    autoComplete="given-name"
                  />

                  <AppleInput
                    id="lastName"
                    label="Фамилия"
                    placeholder="Иванов"
                    value={
                      lastName
                    }
                    onChange={(e) =>
                      setLastName(
                        e.target.value
                      )
                    }
                    disabled={busy}
                    autoComplete="family-name"
                  />
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <AppleInput
                    id="phone"
                    type="tel"
                    label="Телефон"
                    placeholder="+359 88 123 4567"
                    value={phone}
                    onChange={(e) =>
                      setPhone(
                        e.target.value
                      )
                    }
                    disabled={busy}
                    autoComplete="tel"
                    icon={<Phone />}
                  />

<AppleInput
  id="birthDate"
  type="date"
  label="Дата на раждане"
  value={birthDate}
  max={maxBirthDate}
  onChange={(e) => {
    const selectedDate = e.target.value;

    if (selectedDate > maxBirthDate) {
      setBirthDate(maxBirthDate);
      return;
    }

    setBirthDate(selectedDate);
  }}
  disabled={busy}
  icon={<CalendarDays />}
/>
                </div>
              </div>

              {/* PHOTO */}

              <div>
                <SectionTitle>
                  Профилна снимка
                </SectionTitle>

                <label
                  htmlFor="photo"
                  className="group mt-4 flex cursor-pointer items-center gap-5 rounded-[20px] bg-white p-5 ring-1 ring-black/[0.06] transition-all duration-300 hover:ring-black/[0.12]"
                >
                  <div className="relative flex h-[78px] w-[78px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#f5f5f7]">
                    {photoPreview ? (
                      <img
                        src={
                          photoPreview
                        }
                        alt="Профилна снимка"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User className="h-8 w-8 text-[#86868b]" />
                    )}

                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/25 group-hover:opacity-100">
                      <Camera className="h-6 w-6 text-white" />
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold">
                      {photoPreview
                        ? "Промени снимката"
                        : "Добави снимка"}
                    </p>

                    <p className="mt-1 text-[13px] leading-relaxed text-[#86868b]">
                      JPG, PNG или WEBP.
                      Максимум 5 MB.
                    </p>
                  </div>

                  <div className="hidden h-9 items-center rounded-full bg-[#f5f5f7] px-4 text-[12px] font-semibold text-[#0066cc] sm:flex">
                    Избери
                  </div>

                  <input
                    id="photo"
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={busy}
                    onChange={
                      handlePhotoSelection
                    }
                  />
                </label>
              </div>

              {/* ACCOUNT */}

              <div>
                <SectionTitle>
                  Данни за вход
                </SectionTitle>

                <div className="mt-4 space-y-3">
                  <AppleInput
                    id="email"
                    type="email"
                    label="Имейл"
                    placeholder="ivan@example.com"
                    value={email}
                    onChange={(e) =>
                      setEmail(
                        e.target.value
                      )
                    }
                    disabled={busy}
                    autoComplete="email"
                    icon={<Mail />}
                  />

                  <PasswordField
                    id="password"
                    label="Парола"
                    placeholder="Минимум 6 символа"
                    value={password}
                    onChange={
                      setPassword
                    }
                    visible={
                      showPassword
                    }
                    setVisible={
                      setShowPassword
                    }
                    disabled={busy}
                    autoComplete="new-password"
                  />

                  <PasswordField
                    id="confirmPassword"
                    label="Повтори паролата"
                    placeholder="Повтори паролата"
                    value={
                      confirmPassword
                    }
                    onChange={
                      setConfirmPassword
                    }
                    visible={
                      showConfirmPassword
                    }
                    setVisible={
                      setShowConfirmPassword
                    }
                    disabled={busy}
                    autoComplete="new-password"
                  />
                </div>

                {password && (
                  <PasswordHint
                    password={
                      password
                    }
                    confirmed={
                      confirmPassword
                    }
                  />
                )}
              </div>

              {/* ERROR */}

              {error && (
                <div
                  role="alert"
                  className="rounded-[16px] bg-[#fff2f2] px-5 py-4 text-[14px] font-medium leading-relaxed text-[#c50000] ring-1 ring-red-500/10"
                >
                  {error}
                </div>
              )}

              {/* SUBMIT */}

              <Button
                type="submit"
                disabled={busy}
                className="group h-[56px] w-full rounded-full bg-[#0071e3] text-[16px] font-semibold text-white shadow-none transition hover:bg-[#0077ed]"
              >
                {loading ||
                photoUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />

                    {photoUploading
                      ? "Качване..."
                      : "Създаване..."}
                  </>
                ) : (
                  <>
                    Създай профил

                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </Button>

              {/* LOGIN */}

              <p className="text-center text-[14px] text-[#6e6e73]">
                Вече имаш профил?{" "}

                <Link
                  href="/login"
                  className="font-semibold text-[#0066cc] hover:underline"
                >
                  Влез
                </Link>
              </p>

              {/* TERMS */}

              <p className="mx-auto max-w-[500px] text-center text-[11px] leading-[1.6] text-[#86868b]">
                С регистрацията
                създаваш свой играчки
                профил за участие в
                турнири и съхраняване
                на индивидуалната ти
                статистика.
              </p>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}

/* ======================================================== */
/* INPUT                                                     */
/* ======================================================== */

function AppleInput({
  id,
  label,
  icon,
  className = "",
  ...props
}: React.ComponentProps<typeof Input> & {
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="relative">
      {icon && (
        <span className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-[#86868b] [&>svg]:h-[17px] [&>svg]:w-[17px]">
          {icon}
        </span>
      )}

      <Input
        {...props}
        id={id}
        aria-label={label}
        className={`peer h-[58px] rounded-[16px] border-0 bg-white pb-[7px] pt-[22px] text-[15px] text-[#1d1d1f] shadow-none ring-1 ring-black/[0.07] transition placeholder:text-transparent hover:ring-black/[0.12] focus-visible:ring-2 focus-visible:ring-[#0071e3] disabled:bg-white/60 ${
          icon
            ? "pl-11 pr-4"
            : "px-4"
        } ${className}`}
        placeholder={
          props.placeholder ||
          label
        }
      />

      <label
        htmlFor={id}
        className={`pointer-events-none absolute top-[8px] z-10 text-[10px] font-medium tracking-[0.01em] text-[#86868b] ${
          icon
            ? "left-11"
            : "left-4"
        }`}
      >
        {label}
      </label>
    </div>
  );
}

/* ======================================================== */
/* PASSWORD                                                  */
/* ======================================================== */

function PasswordField({
  id,
  label,
  placeholder,
  value,
  onChange,
  visible,
  setVisible,
  disabled,
  autoComplete,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  visible: boolean;
  setVisible: (
    value: boolean
  ) => void;
  disabled: boolean;
  autoComplete?: string;
}) {
  return (
    <div className="relative">
      <Lock className="pointer-events-none absolute left-4 top-1/2 z-10 h-[17px] w-[17px] -translate-y-1/2 text-[#86868b]" />

      <Input
        id={id}
        type={
          visible
            ? "text"
            : "password"
        }
        placeholder={placeholder}
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        disabled={disabled}
        autoComplete={
          autoComplete
        }
        aria-label={label}
        className="h-[58px] rounded-[16px] border-0 bg-white pb-[7px] pl-11 pr-12 pt-[22px] text-[15px] shadow-none ring-1 ring-black/[0.07] transition placeholder:text-transparent hover:ring-black/[0.12] focus-visible:ring-2 focus-visible:ring-[#0071e3]"
      />

      <label
        htmlFor={id}
        className="pointer-events-none absolute left-11 top-[8px] z-10 text-[10px] font-medium text-[#86868b]"
      >
        {label}
      </label>

      <button
        type="button"
        aria-label={
          visible
            ? "Скрий паролата"
            : "Покажи паролата"
        }
        onClick={() =>
          setVisible(!visible)
        }
        className="absolute right-4 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[#86868b] transition hover:bg-black/[0.05] hover:text-black"
      >
        {visible ? (
          <EyeOff className="h-[18px] w-[18px]" />
        ) : (
          <Eye className="h-[18px] w-[18px]" />
        )}
      </button>
    </div>
  );
}

/* ======================================================== */
/* SECTION TITLE                                             */
/* ======================================================== */

function SectionTitle({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <h3 className="text-[13px] font-semibold text-[#6e6e73]">
      {children}
    </h3>
  );
}

/* ======================================================== */
/* LEFT FEATURE                                              */
/* ======================================================== */

function Feature({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-white/[0.08] text-white/80">
        <span className="[&>svg]:h-[18px] [&>svg]:w-[18px]">
          {icon}
        </span>
      </div>

      <div>
        <p className="text-[14px] font-semibold text-white/90">
          {title}
        </p>

        <p className="mt-1 max-w-[370px] text-[13px] leading-relaxed text-white/40">
          {description}
        </p>
      </div>
    </div>
  );
}

/* ======================================================== */
/* PASSWORD HINT                                             */
/* ======================================================== */

function PasswordHint({
  password,
  confirmed,
}: {
  password: string;
  confirmed: string;
}) {
  const longEnough =
    password.length >= 6;

  const matches =
    !!confirmed &&
    password === confirmed;

  return (
    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 px-1">
      <div
        className={`flex items-center gap-1.5 text-[11px] ${
          longEnough
            ? "text-[#22863a]"
            : "text-[#86868b]"
        }`}
      >
        <Check className="h-3 w-3" />

        Поне 6 символа
      </div>

      {confirmed && (
        <div
          className={`flex items-center gap-1.5 text-[11px] ${
            matches
              ? "text-[#22863a]"
              : "text-[#c50000]"
          }`}
        >
          <Check className="h-3 w-3" />

          {matches
            ? "Паролите съвпадат"
            : "Паролите не съвпадат"}
        </div>
      )}
    </div>
  );
}

/* ======================================================== */
/* GOOGLE ICON                                               */
/* ======================================================== */

function GoogleIcon() {
  return (
    <svg
      className="mr-3 h-[19px] w-[19px]"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.91h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.4Z"
      />

      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.97-.9 6.62-2.37l-3.24-2.54c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z"
      />

      <path
        fill="#FBBC05"
        d="M6.39 13.92A6.02 6.02 0 0 1 6.07 12c0-.67.11-1.32.32-1.92V7.46H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.54l3.35-2.62Z"
      />

      <path
        fill="#EA4335"
        d="M12 5.95c1.47 0 2.79.51 3.83 1.5l2.87-2.87C16.97 2.97 14.7 2 12 2a10 10 0 0 0-8.96 5.46l3.35 2.62C7.18 7.71 9.39 5.95 12 5.95Z"
      />
    </svg>
  );
}

/* ======================================================== */
/* GOOGLE ERRORS                                             */
/* ======================================================== */

function mapGoogleError(
  err: unknown
) {
  const code =
    typeof err === "object" &&
    err !== null &&
    "code" in err
      ? String(
          (
            err as {
              code?: unknown;
            }
          ).code
        )
      : "";

  switch (code) {
    case "auth/popup-blocked":
      return "Браузърът блокира Google прозореца. Разреши popup прозорците или опитай отново.";

    case "auth/popup-closed-by-user":
      return "Google регистрацията беше прекратена.";

    case "auth/operation-not-allowed":
      return "Google входът не е активиран във Firebase Authentication.";

    case "auth/unauthorized-domain":
      return "Текущият домейн не е разрешен във Firebase Authentication.";

    default:
      return "Неуспешна регистрация с Google.";
  }
}