import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';

const { warningMock, mockIsCollaborator } = vi.hoisted(() => ({
  warningMock: vi.fn(),
  mockIsCollaborator: ref(false),
}));

vi.mock('@/composables/query/useCollaboratorInfo', () => ({
  useCollaboratorInfo: () => ({
    isCollaborator: mockIsCollaborator,
    collaboratingProjectIds: ref([]),
    isLoadingCollaboratorInfo: ref(false),
    collaboratorInfoError: ref(null),
    refetchCollaboratorInfo: vi.fn(),
  }),
}));

vi.mock('element-plus', () => ({
  ElMessage: {
    warning: warningMock,
  },
}));

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, unknown>) => ({ key, params }),
  }),
}));

let useProjectCreationGuard: (typeof import('@/composables/guard/useProjectCreationGuard'))['useProjectCreationGuard'];

describe('useProjectCreationGuard', () => {
  beforeAll(async () => {
    ({ useProjectCreationGuard } = await import('@/composables/guard/useProjectCreationGuard'));
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsCollaborator.value = false;
  });

  it('allows regular users to create projects', () => {
    mockIsCollaborator.value = false;

    const { canCreateProject } = useProjectCreationGuard();

    expect(canCreateProject.value).toBe(true);
  });

  it('returns true without warning when project creation is allowed', () => {
    mockIsCollaborator.value = false;

    const { ensureCanCreateProject } = useProjectCreationGuard();
    const result = ensureCanCreateProject();

    expect(result).toBe(true);
    expect(warningMock).not.toHaveBeenCalled();
  });

  it('prevents pure collaborators from creating projects', () => {
    mockIsCollaborator.value = true;

    const { canCreateProject } = useProjectCreationGuard();

    expect(canCreateProject.value).toBe(false);
  });

  it('shows collaborator-specific error message', () => {
    mockIsCollaborator.value = true;

    const { ensureCanCreateProject } = useProjectCreationGuard();
    const result = ensureCanCreateProject();

    expect(result).toBe(false);
    expect(warningMock).toHaveBeenCalledWith({
      key: 'message.error.collaborator_cannot_create_project',
    });
  });

  it('isLoading is always false', () => {
    const { isLoading } = useProjectCreationGuard();

    expect(isLoading.value).toBe(false);
  });

  it('returns isCollaborator status', () => {
    mockIsCollaborator.value = true;

    const { isCollaborator } = useProjectCreationGuard();

    expect(isCollaborator.value).toBe(true);
  });
});
