/** Namespace a storage base key to a profile: profileKey("planner.tasks.v1", "guest") -> "planner.tasks.v1:guest". */
export function profileKey(base: string, profileId: string): string {
  return `${base}:${profileId}`;
}
