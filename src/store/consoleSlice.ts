import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "@/store/store";

type ConsoleState = {
  currentProject: string;
};

const initialState: ConsoleState = {
  currentProject: "",
};

const consoleSlice = createSlice({
  initialState,
  name: "console",
  reducers: {
    setCurrentProject: (state, action: PayloadAction<string>) => {
      state.currentProject = action.payload;
    },
  },
});

export const { setCurrentProject } = consoleSlice.actions;

export const selectConsoleCurrentProject = (state: RootState) => state.console.currentProject;

export default consoleSlice.reducer;
