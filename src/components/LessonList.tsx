import { CourseLesson } from '../types/database';
import LessonCard from './LessonCard';

export default function LessonList({
  lessons,
  onEdit,
  onDelete,
  onTogglePublished,
}: {
  lessons: CourseLesson[];
  onEdit: (lesson: CourseLesson) => void;
  onDelete: (lesson: CourseLesson) => void;
  onTogglePublished: (lesson: CourseLesson) => void;
}) {
  return (
    <div className="space-y-4">
      {lessons.map((lesson) => (
        <LessonCard
          key={lesson.id}
          lesson={lesson}
          onEdit={() => onEdit(lesson)}
          onDelete={() => onDelete(lesson)}
          onTogglePublished={() => onTogglePublished(lesson)}
        />
      ))}
    </div>
  );
}
