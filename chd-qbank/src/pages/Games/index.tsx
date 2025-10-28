import { Link } from "react-router-dom";
import { useI18n } from "../../i18n";

const cards = [
  {
    href: "/games/murmurs",
    titleKey: "games.index.cards.murmurs.title",
    descriptionKey: "games.index.cards.murmurs.description",
    defaultTitle: "Guess the Murmur",
    defaultDescription: "Match classic auscultation findings with the correct lesion after listening to real audio clips."
  },
  {
    href: "/games/cxr",
    titleKey: "games.index.cards.cxr.title",
    descriptionKey: "games.index.cards.cxr.description",
    defaultTitle: "CXR Match",
    defaultDescription: "Drop labels onto congenital heart disease radiographs to reinforce imaging patterns."
  },
  {
    href: "/games/ekg",
    titleKey: "games.index.cards.ekg.title",
    descriptionKey: "games.index.cards.ekg.description",
    defaultTitle: "Read the EKG",
    defaultDescription: "Practice spotting hallmark arrhythmias and conduction disturbances on 12-lead tracings."
  }
];

export default function GamesIndex() {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">
          {t("games.index.heading", { defaultValue: "Learning games" })}
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          {t("games.index.description", {
            defaultValue: "Reinforce high-yield patterns through focused mini-games alongside your question bank practice."
          })}
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((card) => (
          <Link
            key={card.href}
            to={card.href}
            className="group block rounded-lg border border-neutral-200 bg-white p-4 shadow-sm transition hover:border-brand-400 hover:shadow-md"
          >
            <h2 className="text-lg font-semibold text-neutral-900 group-hover:text-brand-600">
              {t(card.titleKey, { defaultValue: card.defaultTitle })}
            </h2>
            <p className="mt-2 text-sm text-neutral-600">
              {t(card.descriptionKey, { defaultValue: card.defaultDescription })}
            </p>
            <span className="mt-4 inline-flex items-center text-sm font-medium text-brand-600">
              {t("games.index.open", { defaultValue: "Open game" })}
              <svg
                className="ml-1 h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
