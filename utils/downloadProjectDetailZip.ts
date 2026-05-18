import JSZip from 'jszip';

const modules = import.meta.glob(
  [
    '/src/pages/ProjectDetail.tsx',
    '/src/components/project-detail/ProjectPulseTab.tsx',
    '/src/components/project-detail/ProjectWorkflowsTab.tsx',
    '/src/components/project-detail/ProjectIncidentsTab.tsx',
    '/src/components/project-detail/ProjectQuestionsTab.tsx',
    '/src/components/project-detail/ProjectTaskSubtasks.tsx',
    '/src/components/project-detail/ProjectTaskTypes.ts',
    '/src/components/project-detail/WorkflowToast.tsx',
    '/src/components/project-detail/LinkedResourcesSection.tsx',
    '/src/components/ProjectChecklistManager.tsx',
  ],
  { query: '?raw', eager: true }
);

export async function downloadProjectDetailZip() {
  const zip = new JSZip();

  for (const [path, mod] of Object.entries(modules)) {
    // Remove leading /src/ → keep relative structure
    const relativePath = path.replace(/^\/src\//, '');
    const content = (mod as { default: string }).default;
    zip.file(relativePath, content);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'proyecto-detalle-modulo.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

