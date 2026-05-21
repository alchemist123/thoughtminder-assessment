import { isAnswered } from '@/store/examSessionStore';
import { cn } from '@/lib/utils';

const SECTION_LABEL = {
  quantitative: 'Quantitative',
  verbal: 'Verbal',
  technical: 'Technical',
  coding: 'Coding',
};

export function SectionNav({ sections, questions, answers, currentQuestionId, onSetQuestion }) {
  const currentSection =
    questions.find((q) => q.id === currentQuestionId)?.section ?? sections[0];

  const handleSectionClick = (section) => {
    const sectionQs = questions.filter((q) => q.section === section);
    if (sectionQs.length === 0) return;
    const firstUnanswered = sectionQs.find((q) => !isAnswered(answers[q.id]));
    onSetQuestion((firstUnanswered ?? sectionQs[0]).id);
  };

  const sectionQuestions = questions.filter((q) => q.section === currentSection);

  return (
    <div className="flex flex-col gap-4 p-3">
      {/* Section tabs */}
      <div className="flex flex-col gap-0.5">
        {sections.map((section) => {
          const sqs = questions.filter((q) => q.section === section);
          const answeredCount = sqs.filter((q) => isAnswered(answers[q.id])).length;
          const isActive = section === currentSection;

          return (
            <button
              key={section}
              type="button"
              onClick={() => handleSectionClick(section)}
              className={cn(
                'flex items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <span className="truncate">{SECTION_LABEL[section] ?? section}</span>
              <span className="ml-2 shrink-0 text-xs">
                {answeredCount}/{sqs.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Question number grid for active section */}
      {sectionQuestions.length > 0 && (
        <div>
          <p className="mb-1.5 px-1 text-xs font-medium text-muted-foreground">
            {SECTION_LABEL[currentSection]} questions
          </p>
          <div className="grid grid-cols-5 gap-1">
            {sectionQuestions.map((q) => {
              const globalIdx = questions.findIndex((qs) => qs.id === q.id);
              const answered = isAnswered(answers[q.id]);
              const isCurrent = q.id === currentQuestionId;

              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => onSetQuestion(q.id)}
                  aria-label={`Question ${globalIdx + 1}${answered ? ', answered' : ', unanswered'}`}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded text-xs font-medium transition-colors',
                    answered
                      ? 'bg-green-100 text-green-800 hover:bg-green-200'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80',
                    isCurrent && 'ring-2 ring-primary ring-offset-1'
                  )}
                >
                  {globalIdx + 1}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
