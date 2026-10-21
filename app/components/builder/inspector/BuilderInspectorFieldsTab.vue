<template>
	<p
		v-if="isSource"
		class="zb-help !mb-2 !mt-1.5 text-[11px] leading-[1.65] text-zaux-dark-grey"
	>
		{{ translate("zx_builder_source_fields") }}
	</p>
	<div v-else>
		<p
			class="zb-help !mb-2 !mt-1.5 text-[11px] leading-[1.65] text-zaux-dark-grey"
		>
			{{ translate("zx_builder_fields_hint") }}
		</p>
		<div v-if="activeDefinition.fields.length" class="flex items-center justify-between gap-1 pb-1">
			<h3 class="zb-eyebrow text-[10px] font-semibold uppercase tracking-[1.4px] text-zaux-dark-grey">
				{{ translate("zx_builder_fields") }}
			</h3>
			<BuilderButton
				class="!flex-none"
				variant="alt1"
				size="xs"
				icon="dropdown-close"
				iconOnly
				:disabled="!openFields.size"
				:label="translate('zx_builder_collapse_all')"
				:title="translate('zx_builder_collapse_all')"
				@click="collapseAllFields"
			/>
		</div>
		<div ref="list" @dragover="dragOver" @drop="drop" @dragleave="leaveList">
		<!-- The drop line lives outside <details>: a closed details hides everything but its summary. -->
		<div
			v-for="field in activeDefinition.fields"
			:key="field.key"
			:data-field-key="field.key"
			class="relative"
		>
		<span v-if="dropTarget?.key === field.key" aria-hidden="true"
			class="pointer-events-none absolute inset-x-0 z-10 h-[2px] bg-zaux-accent"
			:class="dropTarget.after ? 'bottom-0' : 'top-0'" />
		<details
			class="zb-field-card"
			:class="{ 'opacity-50': draggedKey === field.key }"
			:open="openFields.has(field.key)"
			@toggle="syncOpen(field.key, $event.target.open)"
		>
			<summary>
				<button
					v-if="activeDefinition.fields.length > 1"
					type="button"
					class="mr-1 cursor-grab rounded-xxs px-0.5 text-zaux-dark-grey hover:bg-zaux-light focus-visible:outline focus-visible:outline-1 focus-visible:outline-zaux-accent active:cursor-grabbing"
					draggable="true"
					:title="translate('zx_builder_field_reorder')"
					:aria-label="translate('zx_builder_field_reorder')"
					@click.prevent.stop
					@dragstart="startDrag($event, field)"
					@dragend="clearDrag"
					@keydown.alt.up.prevent="moveWithKeyboard(field, -1)"
					@keydown.alt.down.prevent="moveWithKeyboard(field, 1)"
				><span aria-hidden="true">⠿</span></button>
				{{ field.label }} <code>{{ field.key }}</code>
				<!-- prevent: a click inside <summary> would also toggle the card. -->
				<span class="float-right" @click.prevent.stop>
					<BuilderButton
						variant="light"
						size="xs"
						icon="delete"
						iconOnly
						:label="translate('zx_builder_delete')"
						@click="deleteField(field.key)"
					/>
				</span>
			</summary>
			<div
				class="zb-field mb-2.5 [&>label]:mb-1 [&>label]:block [&>label]:text-[11px] [&>label]:font-medium [&>label]:text-zaux-dark [&_label_small]:mt-0.5 [&_label_small]:block [&_label_small]:font-mono [&_label_small]:text-[9px] [&_label_small]:text-zaux-dark-grey"
			>
				<label>{{ translate("zx_builder_field_label") }}</label
				><input
					class="px-2 py-1 bg-zaux-light border-none"
					:value="field.label"
					@change="updateField(field.key, 'label', $event.target.value)"
				/>
			</div>
			<div
				class="zb-field mb-2.5 [&>label]:mb-1 [&>label]:block [&>label]:text-[11px] [&>label]:font-medium [&>label]:text-zaux-dark [&_label_small]:mt-0.5 [&_label_small]:block [&_label_small]:font-mono [&_label_small]:text-[9px] [&_label_small]:text-zaux-dark-grey"
			>
				<label>{{ translate("zx_builder_field_type") }}</label
				><select
					class="px-2 py-1 bg-zaux-light border-none"
					:value="field.type"
					@change="changeType(field.key, $event.target.value)"
				>
					<option v-for="type in types" :key="type" :value="type">
						{{ translate(`zx_builder_${type}`) }} · {{ type }}
					</option>
				</select>
			</div>
			<div
				class="zb-field mb-2.5 [&>label]:mb-1 [&>label]:block [&>label]:text-[11px] [&>label]:font-medium [&>label]:text-zaux-dark [&_label_small]:mt-0.5 [&_label_small]:block [&_label_small]:font-mono [&_label_small]:text-[9px] [&_label_small]:text-zaux-dark-grey"
			>
				<label>{{ translate("zx_builder_default") }}</label
				><BuilderValue
					:modelValue="field.default"
					:label="`${field.key} default`"
					:type="fieldInputType(field)"
					:options="field.options"
					:params="field.params"
					@update:modelValue="updateField(field.key, 'default', $event)"
				/>
			</div>
			<div
				v-if="field.type === 'select'"
				class="zb-field mb-2.5 [&>label]:mb-1 [&>label]:block [&>label]:text-[11px] [&>label]:font-medium [&>label]:text-zaux-dark [&_label_small]:mt-0.5 [&_label_small]:block [&_label_small]:font-mono [&_label_small]:text-[9px] [&_label_small]:text-zaux-dark-grey"
			>
				<label>{{ translate("zx_builder_options") }}</label
				><BuilderValue type="json" :label="translate('zx_builder_options')" :modelValue="field.options"
                  @update:modelValue="updateField(field.key, 'options', $event)" />
			</div>
			<div
				v-if="field.type === 'component'"
				class="zb-field mb-2.5 [&>label]:mb-1 [&>label]:block [&>label]:text-[11px] [&>label]:font-medium [&>label]:text-zaux-dark"
			>
				<label>{{ translate("zx_builder_component_mode") }}</label
				><select
					class="px-2 py-1 bg-zaux-light border-none"
					:value="field.params?.mode === 'array' ? 'array' : 'obj'"
					@change="changeComponentMode(field.key, $event.target.value)"
				>
					<option value="obj">{{ translate("zx_builder_component_mode_single") }}</option>
					<option value="array">{{ translate("zx_builder_component_mode_list") }}</option>
				</select>
			</div>
			<!-- Repeater whitelist (params.allowed): empty accepts every component. -->
			<div
				v-if="field.type === 'component' && field.params?.mode === 'array'"
				class="zb-field mb-2.5 grid gap-1 [&>label]:block [&>label]:text-[11px] [&>label]:font-medium [&>label]:text-zaux-dark"
			>
				<label>{{ translate("zx_builder_repeater_allowed") }}</label>
				<div class="flex flex-wrap gap-0.5">
					<span
						v-for="name in field.params.allowed ?? []"
						:key="name"
						class="inline-flex items-center gap-0.5 rounded-xxs bg-zaux-light py-0.25 pl-1 pr-0.25 text-[11px]"
					>{{ name }}<BuilderButton variant="light" size="xs" icon="close" iconOnly :label="translate('zx_builder_delete')" @click="toggleAllowed(field.key, name)" /></span>
					<span v-if="!(field.params.allowed ?? []).length" class="text-[11px] text-zaux-dark-grey">{{ translate("zx_builder_repeater_allowed_any") }}</span>
				</div>
				<BuilderDropdown
					:label="translate('zx_builder_repeater_allowed_add')"
					:items="allowedMenu(field)"
					:filterItems="true"
					@select="toggleAllowed(field.key, $event.id)"
				/>
				<small class="text-[10px] leading-[1.5] text-zaux-dark-grey">{{ translate("zx_builder_repeater_allowed_hint") }}</small>
			</div>
            <label class="block mb-1 text-[11px]">{{ translate('zx_builder_field_show_if') }}</label>
            <BuilderValue type="json" :label="translate('zx_builder_field_show_if')" :modelValue="field.showIf ?? null"
              @update:modelValue="updateField(field.key, 'showIf', $event)" />
		</details>
		</div>
		</div>
		<form
			class="zb-new-field border-t-slim border-zaux-light-grey py-2.5 [&>h3]:mb-2.5 [&>h3]:text-[14px]"
			@submit.prevent="addField"
		>
			<h3>{{ translate("zx_builder_new_field") }}</h3>
			<div
				class="zb-field mb-2.5 [&>label]:mb-1 [&>label]:block [&>label]:text-[11px] [&>label]:font-medium [&>label]:text-zaux-dark [&_label_small]:mt-0.5 [&_label_small]:block [&_label_small]:font-mono [&_label_small]:text-[9px] [&_label_small]:text-zaux-dark-grey"
			>
				<label for="field-key">{{ translate("zx_builder_field_key") }}</label
				><input
					class="px-2 py-1 border-none bg-zaux-light"
					id="field-key"
					v-model="newKey"
					pattern="[A-Za-z_][A-Za-z0-9_.]*"
					required
					placeholder="section.title"
				/>
			</div>
			<div
				class="zb-field mb-2.5 [&>label]:mb-1 [&>label]:block [&>label]:text-[11px] [&>label]:font-medium [&>label]:text-zaux-dark [&_label_small]:mt-0.5 [&_label_small]:block [&_label_small]:font-mono [&_label_small]:text-[9px] [&_label_small]:text-zaux-dark-grey"
			>
				<label for="field-label">{{
					translate("zx_builder_field_label")
				}}</label
				><input
					class="px-2 py-1 border-none bg-zaux-light"
					id="field-label"
					v-model="newLabel"
					required
				/>
			</div>
			<div
				class="zb-field mb-2.5 [&>label]:mb-1 [&>label]:block [&>label]:text-[11px] [&>label]:font-medium [&>label]:text-zaux-dark [&_label_small]:mt-0.5 [&_label_small]:block [&_label_small]:font-mono [&_label_small]:text-[9px] [&_label_small]:text-zaux-dark-grey"
			>
				<label>{{ translate("zx_builder_field_type") }}</label
				><select class="px-2 py-1 border-none bg-zaux-light" v-model="newType">
					<option v-for="type in types" :key="type" :value="type">
						{{ translate(`zx_builder_${type}`) }} · {{ type }}
					</option>
				</select>
			</div>
			<div class="flex justify-end gap-2 flex-wrap">
				<BuilderButton
					size="s"
					type="submit"
					icon="add"
					tag="button"
					:label="translate('zx_builder_add')"
				/>
			</div>
		</form>
		<p
			v-if="fieldError"
			class="zb-field-error !mt-1.5 rounded-xxs bg-utility-error/10 p-1 text-[11px] leading-[1.6] text-utility-error"
		>
			{{ translate(fieldError) }}
		</p>
	</div>
</template>
<script>
import { defineComponent, nextTick, ref } from "vue";
import { useBuilder } from "../../../composables/useBuilder.js";
import { FIELD_TYPES, fieldDefault, fieldInputType, moveField } from "../../../../domain/fields.js";
import { componentMenuItems } from "../../../services/catalog.js";
export default defineComponent({
	setup() {
		const builder = useBuilder();
		const newKey = ref("");
		const newLabel = ref("");
		const newType = ref("text");
		const fieldError = ref("");
		const types = FIELD_TYPES;
		const defaultFor = fieldDefault;
		function updateField(key, property, value) {
			builder.updateDefinition((def) => {
				def.fields.find((field) => field.key === key)[property] = value;
			});
		}
		function changeType(key, type) {
			builder.updateDefinition((def) => {
				const field = def.fields.find((field) => field.key === key);
				field.type = type;
				field.default = defaultFor(type);
				if (type === "select") field.options = [];
				if (type !== "component") delete field.params;
			});
		}
		// Repeater whitelist: adds or removes one component name from params.allowed.
		function toggleAllowed(key, name) {
			if (!name) return;
			builder.updateDefinition((def) => {
				const field = def.fields.find((field) => field.key === key);
				const allowed = new Set(field.params?.allowed ?? []);
				if (allowed.has(name)) allowed.delete(name);
				else allowed.add(name);
				field.params = { ...(field.params ?? {}), allowed: [...allowed] };
				if (!field.params.allowed.length) delete field.params.allowed;
			});
		}
		function allowedMenu(field) {
			const allowed = field.params?.allowed ?? [];
			return componentMenuItems(builder.translate, builder.selectablePartials.value)
				.map((item) => item.id ? { ...item, active: allowed.includes(item.id) } : item);
		}
		// Mirrors Zaux's component field `params.mode`: one descriptor or a list.
		function changeComponentMode(key, mode) {
			builder.updateDefinition((def) => {
				const field = def.fields.find((field) => field.key === key);
				const params = { ...(field.params ?? {}) };
				if (mode === "array") params.mode = "array";
				else delete params.mode;
				if (Object.keys(params).length) field.params = params;
				else delete field.params;
				field.default = fieldDefault(field.type, field.params);
			});
		}
		function addField() {
			const key = newKey.value.trim();
			if (
				!/^[A-Za-z_][\w.]*$/.test(key) ||
				builder.activeDefinition.value.fields.some((field) => field.key === key)
			) {
				fieldError.value = "zx_builder_field_exists";
				return;
			}
			builder.updateDefinition((def) =>
				def.fields.push({
					key,
					label: newLabel.value.trim(),
					type: newType.value,
					default: defaultFor(newType.value),
					...(newType.value === "select" ? { options: [] } : {}),
				}),
			);
			newKey.value = "";
			newLabel.value = "";
			fieldError.value = "";
		}
		// Session-only UI state: which field cards are expanded.
		const openFields = ref(new Set());
		function syncOpen(key, open) {
			if (openFields.value.has(key) === open) return;
			const next = new Set(openFields.value);
			if (open) next.add(key);
			else next.delete(key);
			openFields.value = next;
		}
		function collapseAllFields() {
			openFields.value = new Set();
		}
		const list = ref(null);
		const draggedKey = ref(null);
		const dropTarget = ref(null);
		function clearDrag() {
			draggedKey.value = null;
			dropTarget.value = null;
		}
		function startDrag(event, field) {
			draggedKey.value = field.key;
			event.dataTransfer.setData("application/x-zaux-field", field.key);
			event.dataTransfer.effectAllowed = "move";
			const card = event.target.closest("details");
			if (card) event.dataTransfer.setDragImage(card, 12, 12);
		}
		function dragOver(event) {
			if (!draggedKey.value) return;
			event.preventDefault();
			event.dataTransfer.dropEffect = "move";
			const items = Array.from(list.value.children).filter(
				(item) => item.dataset.fieldKey && item.dataset.fieldKey !== draggedKey.value,
			);
			const before = items.find((item) => {
				const rect = item.getBoundingClientRect();
				return event.clientY < rect.top + rect.height / 2;
			});
			const target = before ?? items.at(-1);
			dropTarget.value = target ? { key: target.dataset.fieldKey, after: !before } : null;
		}
		function leaveList(event) {
			if (!list.value?.contains(event.relatedTarget)) dropTarget.value = null;
		}
		function drop(event) {
			if (!draggedKey.value) return;
			event.preventDefault();
			const key = draggedKey.value;
			const target = dropTarget.value;
			clearDrag();
			if (!target) return;
			// Skip the commit (and its undo step) when the drop keeps the current order.
			const fields = builder.activeDefinition.value.fields;
			const preview = fields.map((field) => ({ key: field.key }));
			moveField(preview, key, target.key, target.after);
			if (preview.every((item, index) => item.key === fields[index].key)) return;
			builder.updateDefinition((def) => moveField(def.fields, key, target.key, target.after));
		}
		async function moveWithKeyboard(field, direction) {
			const fields = builder.activeDefinition.value.fields;
			const index = fields.findIndex((item) => item.key === field.key);
			const target = fields[index + direction];
			if (index < 0 || !target) return;
			builder.updateDefinition((def) => moveField(def.fields, field.key, target.key, direction > 0));
			await nextTick();
			list.value
				?.querySelector(`[data-field-key="${CSS.escape(field.key)}"] summary button`)
				?.focus();
		}
		function deleteField(key) {
			const tree = JSON.stringify(builder.activeDefinition.value.tree);
			if (
				tree.includes(`"$bind":${JSON.stringify(key)}`) ||
				tree.includes(`"$spread":${JSON.stringify(key)}`)
			) {
				fieldError.value = "zx_builder_field_used";
				return;
			}
			builder.updateDefinition((def) => {
				def.fields = def.fields.filter((field) => field.key !== key);
			});
			fieldError.value = "";
		}
		return {
			...builder,
			types, fieldInputType,
			newKey,
			newLabel,
			newType,
			fieldError,
			updateField,
			changeType,
			changeComponentMode,
			toggleAllowed,
			allowedMenu,
			addField,
			deleteField,
			openFields,
			syncOpen,
			collapseAllFields,
			list,
			draggedKey,
			dropTarget,
			startDrag,
			dragOver,
			leaveList,
			drop,
			clearDrag,
			moveWithKeyboard,
		};
	},
});
</script>
