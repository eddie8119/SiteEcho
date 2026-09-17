import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useTaskFilterStore = defineStore('taskFilter', () => {
  const searchQuery = ref('');

  function setSearchQuery(query: string) {
    searchQuery.value = query;
  }

  function clearSearchQuery() {
    searchQuery.value = '';
  }

  return {
    searchQuery,
    setSearchQuery,
    clearSearchQuery,
  };
});
