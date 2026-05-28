import { auth } from '@api/auth';
import { hasPermission } from '@entities/tenant/api/permissions';
import { db, surveys, questions, responses, users } from '@api/db';
import { eq, and } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/api/with-tenant';

import {
  apiError,
  apiForbidden,
  apiSuccess,
  apiUnauthorized,
  apiNotFound,
} from '@api/api-response';
async function getSessionAndRole(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user?.id) {
    return null;
  }

  const user = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  return {
    session,
    userId: session.user.id,
    role: user[0]?.role || 'RESIDENT',
  };
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authData = await getSessionAndRole(request);

  if (!authData) {
    return apiUnauthorized();
  }

  if (!hasPermission(authData.role, 'content')) {
    return apiForbidden();
  }

  const { tenantId } = await withTenant();
  const { id: surveyId } = await params;

  // Verify the survey exists and belongs to the current tenant
  const survey = await db
    .select()
    .from(surveys)
    .where(and(eq(surveys.id, surveyId), eq(surveys.tenantId, tenantId)))
    .limit(1);

  if (survey.length === 0) {
    return apiNotFound('Survey not found');
  }

  const surveyData = survey[0];

  // Fetch all questions for this survey
  const surveyQuestions = await db
    .select()
    .from(questions)
    .where(eq(questions.surveyId, surveyId))
    .orderBy(questions.order);

  // Fetch all responses for this survey
  const surveyResponses = await db.select().from(responses).where(eq(responses.surveyId, surveyId));

  const totalResponses = surveyResponses.length;

  // Aggregate responses per question
  const aggregatedQuestions = surveyQuestions.map(question => {
    const questionResponses = surveyResponses.map(r => r.answers as Record<string, unknown>);

    const baseQuestion = {
      id: question.id,
      text: question.text,
      type: question.type,
      options: question.options,
      responses: {
        total: 0,
        distribution: {} as Record<string, number>,
      },
    };

    if (question.type === 'TEXT') {
      // For text questions, collect response texts (limited to 50)
      const textResponses: string[] = [];
      for (const answers of questionResponses) {
        const answer = answers[question.id];
        if (typeof answer === 'string' && answer.trim()) {
          textResponses.push(answer.trim());
        }
      }
      return {
        ...baseQuestion,
        responses: {
          total: textResponses.length,
          texts: textResponses.slice(0, 50),
        },
      };
    }

    if (question.type === 'RATING') {
      // For rating questions, calculate average and distribution
      const ratingDistribution: Record<string, number> = {
        '1': 0,
        '2': 0,
        '3': 0,
        '4': 0,
        '5': 0,
      };
      let totalRating = 0;
      let ratingCount = 0;

      for (const answers of questionResponses) {
        const rating = answers[question.id];
        if (typeof rating === 'number' && rating >= 1 && rating <= 5) {
          ratingDistribution[String(rating)] = (ratingDistribution[String(rating)] || 0) + 1;
          totalRating += rating;
          ratingCount++;
        }
      }

      return {
        ...baseQuestion,
        responses: {
          total: ratingCount,
          distribution: ratingDistribution,
          average: ratingCount > 0 ? Math.round((totalRating / ratingCount) * 10) / 10 : 0,
        },
      };
    }

    // For SINGLE_CHOICE, MULTIPLE_CHOICE, YES_NO — count answer distribution
    const distribution: Record<string, number> = {};

    for (const answers of questionResponses) {
      const answer = answers[question.id];
      if (Array.isArray(answer)) {
        // Multiple choice — count each selected option
        for (const val of answer) {
          distribution[String(val)] = (distribution[String(val)] || 0) + 1;
        }
      } else if (answer !== null && answer !== undefined) {
        distribution[String(answer)] = (distribution[String(answer)] || 0) + 1;
      }
    }

    return {
      ...baseQuestion,
      responses: {
        total: Object.values(distribution).reduce((sum, count) => sum + count, 0),
        distribution,
      },
    };
  });

  return apiSuccess({
    survey: {
      id: surveyData.id,
      title: surveyData.title,
      status: surveyData.status,
      type: surveyData.type,
    },
    totalResponses,
    questions: aggregatedQuestions,
  });
}
