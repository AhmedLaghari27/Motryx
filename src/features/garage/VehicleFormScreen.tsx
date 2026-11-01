import React, { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/routes';
import { Button, ErrorState, Screen, Text, TextField, type TextFieldHandle } from '@/components';
import { useVehicleStore } from '@/state/vehicle.store';
import { spacing } from '@/theme/tokens';
import type { VehicleDraft } from '@/types/vehicle';
import { successHaptic, warningHaptic } from '@/utils/haptics';
import { draftFromVehicle, validateVehicleDraft, type VehicleErrors } from '@/utils/vehicle';

type Props = NativeStackScreenProps<RootStackParamList, 'VehicleForm'>;

export function VehicleFormScreen({ navigation, route }: Props) {
  const vehicleId = route.params?.vehicleId;
  // Snapshot at open, so the form does not blink to "not found" while a delete is finishing.
  const [existing] = useState(() =>
    vehicleId ? useVehicleStore.getState().vehicles.find((v) => v.id === vehicleId) : undefined,
  );
  const add = useVehicleStore((s) => s.add);
  const update = useVehicleStore((s) => s.update);
  const remove = useVehicleStore((s) => s.remove);

  const [draft, setDraft] = useState<VehicleDraft>(() => draftFromVehicle(existing));
  const [errors, setErrors] = useState<VehicleErrors>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const makeRef = useRef<TextFieldHandle>(null);
  const modelRef = useRef<TextFieldHandle>(null);
  const yearRef = useRef<TextFieldHandle>(null);

  if (vehicleId && !existing) {
    return (
      <Screen>
        <ErrorState
          title="Vehicle not found"
          message="It may have been deleted."
          actionLabel="Go back"
          onAction={() => navigation.goBack()}
        />
      </Screen>
    );
  }

  const change = (key: keyof VehicleDraft) => (text: string) => {
    const value = key === 'year' ? text.replace(/\D/g, '') : text;
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  };

  const save = async () => {
    const result = validateVehicleDraft(draft, new Date().getFullYear());
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setSaveError(null);
    setSaving(true);
    const outcome = existing ? await update(existing.id, result.value) : await add(result.value);
    setSaving(false);
    if (!outcome.ok) {
      setSaveError(outcome.message);
      return;
    }
    successHaptic();
    navigation.goBack();
  };

  const confirmDelete = () => {
    if (!existing) return;
    warningHaptic();
    Alert.alert('Delete this vehicle?', 'It will be removed from this phone. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void remove(existing.id).then((r) => {
            if (r.ok) navigation.goBack();
            else setSaveError('Could not delete the vehicle. Try again.');
          });
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen scroll>
        <TextField
          label="Nickname"
          value={draft.nickname}
          onChangeText={change('nickname')}
          error={errors.nickname}
          placeholder="Daily, Track car, Dad’s truck"
          maxLength={40}
          autoCapitalize="words"
          returnKeyType="next"
          onSubmitEditing={() => makeRef.current?.focus()}
        />

        <View style={styles.group}>
          <Text tone="secondary">
            Not sure of the details? Leave make, model and year empty. Motryx works without them.
          </Text>
          <TextField
            label="Make (optional)"
            value={draft.make}
            onChangeText={change('make')}
            error={errors.make}
            placeholder="Toyota"
            maxLength={40}
            autoCapitalize="words"
            returnKeyType="next"
            inputRef={makeRef}
            onSubmitEditing={() => modelRef.current?.focus()}
          />
          <TextField
            label="Model (optional)"
            value={draft.model}
            onChangeText={change('model')}
            error={errors.model}
            placeholder="Corolla"
            maxLength={40}
            autoCapitalize="words"
            returnKeyType="next"
            inputRef={modelRef}
            onSubmitEditing={() => yearRef.current?.focus()}
          />
          <TextField
            label="Year (optional)"
            value={draft.year}
            onChangeText={change('year')}
            error={errors.year}
            placeholder="2018"
            keyboardType="number-pad"
            maxLength={4}
            returnKeyType="done"
            inputRef={yearRef}
            onSubmitEditing={() => void save()}
          />
        </View>

        {saveError ? (
          <Text tone="error" accessibilityRole="alert">
            {saveError}
          </Text>
        ) : null}

        <Button label={existing ? 'Save changes' : 'Save vehicle'} onPress={() => void save()} loading={saving} />
        {existing ? <Button label="Delete vehicle" variant="destructive" onPress={confirmDelete} /> : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  group: { gap: spacing.lg },
});
