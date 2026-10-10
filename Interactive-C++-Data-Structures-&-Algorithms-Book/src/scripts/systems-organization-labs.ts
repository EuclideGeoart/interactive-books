import { mountTraceLab } from './trace-lab';
import { InspectionDiagram } from './inspection-diagram';
import { organizationAdapter, type OrganizationKind } from '../visualizers/systems-organization/adapter';
import { drawOrganization, inspectOrganization, describeOrganization } from '../visualizers/systems-organization/presentation';
import type { OrganizationState } from '../visualizers/systems-organization/types';
for (const wrapper of document.querySelectorAll<HTMLElement>('[data-organization-lab]')) {
  const root = wrapper.querySelector<HTMLElement>('[data-chapter-lab]')!;
  mountTraceLab(root, organizationAdapter(wrapper.dataset.organizationLab as OrganizationKind));
  root.querySelector<HTMLElement>('[data-mobile-code]')!.tabIndex = 0;
}
for (const root of document.querySelectorAll<HTMLElement>('[data-organization-preview]')) {
  const state: OrganizationState = JSON.parse(root.querySelector('[data-organization-state]')!.textContent!);
  new InspectionDiagram(root, { draw: drawOrganization, inspect: inspectOrganization, describe: describeOrganization }, state, `organization-${root.dataset.organizationPreview}-preview`);
}
