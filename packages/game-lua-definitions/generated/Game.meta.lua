---@meta

-- GENERATED FILE — DO NOT EDIT BY HAND.
--
-- Lua Language Server definitions for the Game.* mission script commands
-- created at runtime by Donut Team's Game.lua.
--
-- Regenerate with:  sah lua-defs generate
-- Verify with:      sah lua-defs check
--
-- Generator:        springfield-after-hours-toolkit v0.1.1
-- Derived from:     donutteam/game-lua
-- Pinned commit:    74f8059127bcd9555e6417d9b0b4f5dcef5b9a22
-- Source file:      src/Game.lua
-- Source sha256:    a382b01ef5e1d8a2c9ed0ff0fab10156f33b083d232eb9d392977cfb8181a128
-- Upstream licence: MIT — Copyright (c) 2022 Donut Team
--
-- Commands:         339
-- Not_ inverses:    10
--
-- This file contains DERIVED METADATA (command names, argument counts and
-- scope rules), not upstream source code. Game.lua itself is fetched from
-- Donut Team under their MIT licence and is not redistributed here.
--
-- WHAT THIS FILE PROVES AND DOES NOT PROVE
-- Completion and argument-count checking in your editor reflect Game.lua’s
-- own command tables. They do NOT prove a script works in the game: argument
-- MEANINGS are undocumented upstream, and scope rules below are documentation
-- only — the language server cannot verify where in a script you called
-- something. Test in the Mod Launcher.

error("Meta files should not be executed.")

---The table Game.lua populates with one function per script command.
---@class GameCommands
Game = Game or {}

---Emits the `ActivateTrigger` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---**Warning:** Donut Team's documentation marks this command "unused" — Radical's own scripts never used it in a working form. It may do nothing.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.ActivateTrigger(arg1) end

---Emits the `ActivateVehicle` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes 3–4 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
---@param arg3 any
---@param arg4? any
function Game.ActivateVehicle(arg1, arg2, arg3, arg4) end

---Emits the `AddAmbientCharacter` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes 2–3 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
---@param arg3? any
function Game.AddAmbientCharacter(arg1, arg2, arg3) end

---Emits the `AddAmbientNpcAnimation` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes 1–2 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2? any
function Game.AddAmbientNpcAnimation(arg1, arg2) end

---Emits the `AddAmbientNPCWaypoint` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 2 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
function Game.AddAmbientNPCWaypoint(arg1, arg2) end

---Emits the `AddAmbientPcAnimation` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes 1–2 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2? any
function Game.AddAmbientPcAnimation(arg1, arg2) end

---Emits the `AddBehaviour` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes 2–7 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
---@param arg3? any
---@param arg4? any
---@param arg5? any
---@param arg6? any
---@param arg7? any
function Game.AddBehaviour(arg1, arg2, arg3, arg4, arg5, arg6, arg7) end

---Emits the `AddBonusMission` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.AddBonusMission(arg1) end

---Emits the `AddBonusMissionNPCWaypoint` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 2 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
function Game.AddBonusMissionNPCWaypoint(arg1, arg2) end

---Emits the `AddBonusObjective` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes 1–2 arguments.
---**Provided by:** the base game.
---**Warning:** Donut Team's documentation marks this command "unused" — Radical's own scripts never used it in a working form. It may do nothing.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2? any
function Game.AddBonusObjective(arg1, arg2) end

---Emits the `AddCharacter` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 2 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
function Game.AddCharacter(arg1, arg2) end

---Emits the `AddCollectible` script command.
---
---**Scope:** must appear inside a `Objective` scope.
---**Arguments:** takes 1–4 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2? any
---@param arg3? any
---@param arg4? any
function Game.AddCollectible(arg1, arg2, arg3, arg4) end

---Emits the `AddCollectibleStateProp` script command.
---
---**Scope:** must appear inside a `Mission` scope.
---**Arguments:** takes exactly 3 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
---@param arg3 any
function Game.AddCollectibleStateProp(arg1, arg2, arg3) end

---Emits the `AddCondition` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Opens scope:** `Condition`.
---**Arguments:** takes 1–2 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2? any
function Game.AddCondition(arg1, arg2) end

---Emits the `AddCondTargetModel` script command.
---
---**Scope:** must appear inside a `Condition` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.AddCondTargetModel(arg1) end

---Emits the `AddDriver` script command.
---
---**Scope:** must appear inside a `Objective` scope.
---**Arguments:** takes exactly 2 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
function Game.AddDriver(arg1, arg2) end

---Emits the `AddFlyingActor` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 5 arguments.
---**Provided by:** the base game.
---**Warning:** Donut Team's documentation marks this command "unused" — Radical's own scripts never used it in a working form. It may do nothing.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
---@param arg3 any
---@param arg4 any
---@param arg5 any
function Game.AddFlyingActor(arg1, arg2, arg3, arg4, arg5) end

---Emits the `AddFlyingActorByLocator` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes 3–4 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
---@param arg3 any
---@param arg4? any
function Game.AddFlyingActorByLocator(arg1, arg2, arg3, arg4) end

---Emits the `AddGagBinding` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 5 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
---@param arg3 any
---@param arg4 any
---@param arg5 any
function Game.AddGagBinding(arg1, arg2, arg3, arg4, arg5) end

---Emits the `AddGlobalProp` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---**Warning:** Donut Team's documentation marks this command "unused" — Radical's own scripts never used it in a working form. It may do nothing.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.AddGlobalProp(arg1) end

---Emits the `AddMission` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.AddMission(arg1) end

---Emits the `AddNPC` script command.
---
---**Scope:** must appear inside a `Objective` scope.
---**Arguments:** takes 2–3 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
---@param arg3? any
function Game.AddNPC(arg1, arg2, arg3) end

---Emits the `AddNPCCharacterBonusMission` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes 7–8 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
---@param arg3 any
---@param arg4 any
---@param arg5 any
---@param arg6 any
---@param arg7 any
---@param arg8? any
function Game.AddNPCCharacterBonusMission(arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8) end

---Emits the `AddObjective` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Opens scope:** `Objective`.
---**Arguments:** takes 1–3 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2? any
---@param arg3? any
function Game.AddObjective(arg1, arg2, arg3) end

---Emits the `AddObjectiveNPCWaypoint` script command.
---
---**Scope:** must appear inside a `Objective` scope.
---**Arguments:** takes exactly 2 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
function Game.AddObjectiveNPCWaypoint(arg1, arg2) end

---Emits the `AddObjTargetModel` script command.
---
---**Scope:** must appear inside a `Objective` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.AddObjTargetModel(arg1) end

---Emits the `AddParkedCar` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.AddParkedCar(arg1) end

---Emits the `AddPed` script command.
---
---**Scope:** must appear inside a `PedGroup` scope.
---**Arguments:** takes exactly 2 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
function Game.AddPed(arg1, arg2) end

---Emits the `AddPurchaseCarNPCWaypoint` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 2 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
function Game.AddPurchaseCarNPCWaypoint(arg1, arg2) end

---Emits the `AddPurchaseCarReward` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes 5–6 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
---@param arg3 any
---@param arg4 any
---@param arg5 any
---@param arg6? any
function Game.AddPurchaseCarReward(arg1, arg2, arg3, arg4, arg5, arg6) end

---Emits the `AddSafeZone` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes exactly 2 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
function Game.AddSafeZone(arg1, arg2) end

---Emits the `AddShield` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 2 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
function Game.AddShield(arg1, arg2) end

---Emits the `AddSpawnPoint` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 8 arguments.
---**Provided by:** the base game.
---**Warning:** Donut Team's documentation marks this command "commented" — Radical's own scripts never used it in a working form. It may do nothing.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
---@param arg3 any
---@param arg4 any
---@param arg5 any
---@param arg6 any
---@param arg7 any
---@param arg8 any
function Game.AddSpawnPoint(arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8) end

---Emits the `AddSpawnPointByLocatorScript` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 6 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
---@param arg3 any
---@param arg4 any
---@param arg5 any
---@param arg6 any
function Game.AddSpawnPointByLocatorScript(arg1, arg2, arg3, arg4, arg5, arg6) end

---Emits the `AddStage` script command.
---
---**Scope:** must appear inside a `Mission` scope.
---**Opens scope:** `Stage`.
---**Arguments:** takes 0–7 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1? any
---@param arg2? any
---@param arg3? any
---@param arg4? any
---@param arg5? any
---@param arg6? any
---@param arg7? any
function Game.AddStage(arg1, arg2, arg3, arg4, arg5, arg6, arg7) end

---Emits the `AddStageCharacter` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes 3–5 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
---@param arg3 any
---@param arg4? any
---@param arg5? any
function Game.AddStageCharacter(arg1, arg2, arg3, arg4, arg5) end

---Emits the `AddStageDynaLoadData` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes 1–2 arguments.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2? any
function Game.AddStageDynaLoadData(arg1, arg2) end

---Emits the `AddStageMusicChange` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes no arguments.
---**Provided by:** the base game.
function Game.AddStageMusicChange() end

---Emits the `AddStageTime` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.AddStageTime(arg1) end

---Emits the `AddStageVehicle` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes 3–5 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
---@param arg3 any
---@param arg4? any
---@param arg5? any
function Game.AddStageVehicle(arg1, arg2, arg3, arg4, arg5) end

---Emits the `AddStageVehicleCharacter` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes 2–4 arguments.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
---@param arg3? any
---@param arg4? any
function Game.AddStageVehicleCharacter(arg1, arg2, arg3, arg4) end

---Emits the `AddStageWaypoint` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.AddStageWaypoint(arg1) end

---Emits the `AddTeleportDest` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes 3–5 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
---@param arg3 any
---@param arg4? any
---@param arg5? any
function Game.AddTeleportDest(arg1, arg2, arg3, arg4, arg5) end

---Emits the `AddToCountdownSequence` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes 1–2 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2? any
function Game.AddToCountdownSequence(arg1, arg2) end

---Emits the `AddTrafficModel` script command.
---
---**Scope:** must appear inside a `TrafficGroup` scope.
---**Arguments:** takes 2–3 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
---@param arg3? any
function Game.AddTrafficModel(arg1, arg2, arg3) end

---Emits the `AddVehicleCharacter` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes 1–3 arguments.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2? any
---@param arg3? any
function Game.AddVehicleCharacter(arg1, arg2, arg3) end

---Emits the `AddVehicleCharacterSuppressionCharacter` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 2 arguments.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
function Game.AddVehicleCharacterSuppressionCharacter(arg1, arg2) end

---Emits the `AddVehicleSelectInfo` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 3 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
---@param arg3 any
function Game.AddVehicleSelectInfo(arg1, arg2, arg3) end

---Emits the `AllowMissionAbort` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.AllowMissionAbort(arg1) end

---Emits the `AllowRockOut` script command.
---
---**Scope:** must appear inside a `Objective` scope.
---**Arguments:** takes no arguments.
---**Provided by:** the base game.
function Game.AllowRockOut() end

---Emits the `AllowUserDump` script command.
---
---**Scope:** must appear inside a `Objective` scope.
---**Arguments:** takes no arguments.
---**Provided by:** the base game.
---**Warning:** Donut Team's documentation marks this command "unused" — Radical's own scripts never used it in a working form. It may do nothing.
function Game.AllowUserDump() end

---Emits the `AmbientAnimationRandomize` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes exactly 2 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
function Game.AmbientAnimationRandomize(arg1, arg2) end

---Emits the `AttachStatePropCollectible` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 2 arguments.
---**Provided by:** the base game.
---**Warning:** Donut Team's documentation marks this command "commented" — Radical's own scripts never used it in a working form. It may do nothing.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
function Game.AttachStatePropCollectible(arg1, arg2) end

---Emits the `BindCollectibleTo` script command.
---
---**Scope:** must appear inside a `Objective` scope.
---**Arguments:** takes exactly 2 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
function Game.BindCollectibleTo(arg1, arg2) end

---Emits the `BindReward` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes 5–7 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
---@param arg3 any
---@param arg4 any
---@param arg5 any
---@param arg6? any
---@param arg7? any
function Game.BindReward(arg1, arg2, arg3, arg4, arg5, arg6, arg7) end

---Emits the `CharacterIsChild` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---**Warning:** Donut Team's documentation marks this command "unused" — Radical's own scripts never used it in a working form. It may do nothing.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.CharacterIsChild(arg1) end

---Emits the `CHECKPOINT_HERE` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes no arguments.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
function Game.CHECKPOINT_HERE() end

---Emits the `ClearAmbientAnimations` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.ClearAmbientAnimations(arg1) end

---Emits the `ClearGagBindings` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes no arguments.
---**Provided by:** the base game.
function Game.ClearGagBindings() end

---Emits the `ClearTrafficForStage` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes no arguments.
---**Provided by:** the base game.
function Game.ClearTrafficForStage() end

---Emits the `ClearVehicleSelectInfo` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes no arguments.
---**Provided by:** the base game.
---**Warning:** Donut Team's documentation marks this command "unused" — Radical's own scripts never used it in a working form. It may do nothing.
function Game.ClearVehicleSelectInfo() end

---Emits the `CloseCondition` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Closes scope:** `Condition`.
---**Arguments:** takes no arguments.
---**Provided by:** the base game.
function Game.CloseCondition() end

---Emits the `CloseMission` script command.
---
---**Scope:** no scope requirement recorded.
---**Closes scope:** `Mission`.
---**Arguments:** takes no arguments.
---**Provided by:** the base game.
function Game.CloseMission() end

---Emits the `CloseObjective` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Closes scope:** `Objective`.
---**Arguments:** takes no arguments.
---**Provided by:** the base game.
function Game.CloseObjective() end

---Emits the `ClosePedGroup` script command.
---
---**Scope:** no scope requirement recorded.
---**Closes scope:** `PedGroup`.
---**Arguments:** takes no arguments.
---**Provided by:** the base game.
function Game.ClosePedGroup() end

---Emits the `CloseStage` script command.
---
---**Scope:** must appear inside a `Mission` scope.
---**Closes scope:** `Stage`.
---**Arguments:** takes no arguments.
---**Provided by:** the base game.
function Game.CloseStage() end

---Emits the `CloseTrafficGroup` script command.
---
---**Scope:** no scope requirement recorded.
---**Closes scope:** `TrafficGroup`.
---**Arguments:** takes no arguments.
---**Provided by:** the base game.
function Game.CloseTrafficGroup() end

---Emits the `CreateActionEventTrigger` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 5 arguments.
---**Provided by:** the base game.
---**Warning:** Donut Team's documentation marks this command "unused" — Radical's own scripts never used it in a working form. It may do nothing.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
---@param arg3 any
---@param arg4 any
---@param arg5 any
function Game.CreateActionEventTrigger(arg1, arg2, arg3, arg4, arg5) end

---Emits the `CreateAnimPhysObject` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 2 arguments.
---**Provided by:** the base game.
---**Warning:** Donut Team's documentation marks this command "unused" — Radical's own scripts never used it in a working form. It may do nothing.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
function Game.CreateAnimPhysObject(arg1, arg2) end

---Emits the `CreateChaseManager` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 3 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
---@param arg3 any
function Game.CreateChaseManager(arg1, arg2, arg3) end

---Emits the `CreatePedGroup` script command.
---
---**Scope:** no scope requirement recorded.
---**Opens scope:** `PedGroup`.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.CreatePedGroup(arg1) end

---Emits the `CreateTrafficGroup` script command.
---
---**Scope:** no scope requirement recorded.
---**Opens scope:** `TrafficGroup`.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.CreateTrafficGroup(arg1) end

---Emits the `DeactivateTrigger` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---**Warning:** Donut Team's documentation marks this command "unused" — Radical's own scripts never used it in a working form. It may do nothing.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.DeactivateTrigger(arg1) end

---Emits the `DebugBreak` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes no arguments.
---**Provided by:** the `DebugTest` hack.
function Game.DebugBreak() end

---Emits the `DisableHitAndRun` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes no arguments.
---**Provided by:** the base game.
function Game.DisableHitAndRun() end

---Emits the `DisableTrigger` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.DisableTrigger(arg1) end

---Emits the `EnableHitAndRun` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes no arguments.
---**Provided by:** the base game.
---**Warning:** Donut Team's documentation marks this command "unused" — Radical's own scripts never used it in a working form. It may do nothing.
function Game.EnableHitAndRun() end

---Emits the `EnableTutorialMode` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.EnableTutorialMode(arg1) end

---Emits the `GagBegin` script command.
---
---**Scope:** no scope requirement recorded.
---**Opens scope:** `Gag`.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.GagBegin(arg1) end

---Emits the `GagCheckCollCards` script command.
---
---**Scope:** must appear inside a `Gag` scope.
---**Arguments:** takes exactly 5 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
---@param arg3 any
---@param arg4 any
---@param arg5 any
function Game.GagCheckCollCards(arg1, arg2, arg3, arg4, arg5) end

---Emits the `GagCheckMovie` script command.
---
---**Scope:** must appear inside a `Gag` scope.
---**Arguments:** takes exactly 4 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
---@param arg3 any
---@param arg4 any
function Game.GagCheckMovie(arg1, arg2, arg3, arg4) end

---Emits the `GagEnd` script command.
---
---**Scope:** no scope requirement recorded.
---**Closes scope:** `Gag`.
---**Arguments:** takes no arguments.
---**Provided by:** the base game.
function Game.GagEnd() end

---Emits the `GagPlayFMV` script command.
---
---**Scope:** must appear inside a `Gag` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.GagPlayFMV(arg1) end

---Emits the `GagSetAnimCollision` script command.
---
---**Scope:** must appear inside a `Gag` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.GagSetAnimCollision(arg1) end

---Emits the `GagSetCameraShake` script command.
---
---**Scope:** must appear inside a `Gag` scope.
---**Arguments:** takes 2–3 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
---@param arg3? any
function Game.GagSetCameraShake(arg1, arg2, arg3) end

---Emits the `GagSetCoins` script command.
---
---**Scope:** must appear inside a `Gag` scope.
---**Arguments:** takes 1–2 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2? any
function Game.GagSetCoins(arg1, arg2) end

---Emits the `GagSetCycle` script command.
---
---**Scope:** must appear inside a `Gag` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.GagSetCycle(arg1) end

---Emits the `GagSetInterior` script command.
---
---**Scope:** must appear inside a `Gag` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.GagSetInterior(arg1) end

---Emits the `GagSetIntro` script command.
---
---**Scope:** must appear inside a `Gag` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.GagSetIntro(arg1) end

---Emits the `GagSetLoadDistances` script command.
---
---**Scope:** must appear inside a `Gag` scope.
---**Arguments:** takes exactly 2 arguments.
---**Provided by:** the base game.
---**Warning:** Donut Team's documentation marks this command "unused" — Radical's own scripts never used it in a working form. It may do nothing.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
function Game.GagSetLoadDistances(arg1, arg2) end

---Emits the `GagSetOutro` script command.
---
---**Scope:** must appear inside a `Gag` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.GagSetOutro(arg1) end

---Emits the `GagSetPersist` script command.
---
---**Scope:** must appear inside a `Gag` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.GagSetPersist(arg1) end

---Emits the `GagSetPosition` script command.
---
---**Scope:** must appear inside a `Gag` scope.
---**Arguments:** takes 1–3 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2? any
---@param arg3? any
function Game.GagSetPosition(arg1, arg2, arg3) end

---Emits the `GagSetRandom` script command.
---
---**Scope:** must appear inside a `Gag` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.GagSetRandom(arg1) end

---Emits the `GagSetSound` script command.
---
---**Scope:** must appear inside a `Gag` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.GagSetSound(arg1) end

---Emits the `GagSetSoundLoadDistances` script command.
---
---**Scope:** must appear inside a `Gag` scope.
---**Arguments:** takes exactly 2 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
function Game.GagSetSoundLoadDistances(arg1, arg2) end

---Emits the `GagSetSparkle` script command.
---
---**Scope:** must appear inside a `Gag` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.GagSetSparkle(arg1) end

---Emits the `GagSetTrigger` script command.
---
---**Scope:** must appear inside a `Gag` scope.
---**Arguments:** takes 3–5 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
---@param arg3 any
---@param arg4? any
---@param arg5? any
function Game.GagSetTrigger(arg1, arg2, arg3, arg4, arg5) end

---Emits the `GagSetWeight` script command.
---
---**Scope:** must appear inside a `Gag` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---**Warning:** Donut Team's documentation marks this command "unused" — Radical's own scripts never used it in a working form. It may do nothing.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.GagSetWeight(arg1) end

---Emits the `GoToPsScreenWhenDone` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes no arguments.
---**Provided by:** the base game.
function Game.GoToPsScreenWhenDone() end

---Emits the `IfAllCheatsEnabled` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes 1–15 arguments.
---**Conditional:** opens a conditional block. Close it with `Game.EndIf()`, not `}`.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2? any
---@param arg3? any
---@param arg4? any
---@param arg5? any
---@param arg6? any
---@param arg7? any
---@param arg8? any
---@param arg9? any
---@param arg10? any
---@param arg11? any
---@param arg12? any
---@param arg13? any
---@param arg14? any
---@param arg15? any
function Game.IfAllCheatsEnabled(arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11, arg12, arg13, arg14, arg15) end

---Emits the `IfAllMissionsCompleted` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes 1–15 arguments.
---**Conditional:** opens a conditional block. Close it with `Game.EndIf()`, not `}`.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2? any
---@param arg3? any
---@param arg4? any
---@param arg5? any
---@param arg6? any
---@param arg7? any
---@param arg8? any
---@param arg9? any
---@param arg10? any
---@param arg11? any
---@param arg12? any
---@param arg13? any
---@param arg14? any
---@param arg15? any
function Game.IfAllMissionsCompleted(arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11, arg12, arg13, arg14, arg15) end

---Emits the `IfAnyCheatEnabled` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes 1–15 arguments.
---**Conditional:** opens a conditional block. Close it with `Game.EndIf()`, not `}`.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2? any
---@param arg3? any
---@param arg4? any
---@param arg5? any
---@param arg6? any
---@param arg7? any
---@param arg8? any
---@param arg9? any
---@param arg10? any
---@param arg11? any
---@param arg12? any
---@param arg13? any
---@param arg14? any
---@param arg15? any
function Game.IfAnyCheatEnabled(arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11, arg12, arg13, arg14, arg15) end

---Emits the `IfAnyMissionCompleted` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes 1–15 arguments.
---**Conditional:** opens a conditional block. Close it with `Game.EndIf()`, not `}`.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2? any
---@param arg3? any
---@param arg4? any
---@param arg5? any
---@param arg6? any
---@param arg7? any
---@param arg8? any
---@param arg9? any
---@param arg10? any
---@param arg11? any
---@param arg12? any
---@param arg13? any
---@param arg14? any
---@param arg15? any
function Game.IfAnyMissionCompleted(arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11, arg12, arg13, arg14, arg15) end

---Emits the `IfCurrentCar` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes 1–15 arguments.
---**Conditional:** opens a conditional block. Close it with `Game.EndIf()`, not `}`.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2? any
---@param arg3? any
---@param arg4? any
---@param arg5? any
---@param arg6? any
---@param arg7? any
---@param arg8? any
---@param arg9? any
---@param arg10? any
---@param arg11? any
---@param arg12? any
---@param arg13? any
---@param arg14? any
---@param arg15? any
function Game.IfCurrentCar(arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11, arg12, arg13, arg14, arg15) end

---Emits the `IfCurrentCheckpoint` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes no arguments.
---**Conditional:** opens a conditional block. Close it with `Game.EndIf()`, not `}`.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
function Game.IfCurrentCheckpoint() end

---Emits the `IfCurrentLevel` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes 1–15 arguments.
---**Conditional:** opens a conditional block. Close it with `Game.EndIf()`, not `}`.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2? any
---@param arg3? any
---@param arg4? any
---@param arg5? any
---@param arg6? any
---@param arg7? any
---@param arg8? any
---@param arg9? any
---@param arg10? any
---@param arg11? any
---@param arg12? any
---@param arg13? any
---@param arg14? any
---@param arg15? any
function Game.IfCurrentLevel(arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11, arg12, arg13, arg14, arg15) end

---Emits the `IfCurrentSkin` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes 1–15 arguments.
---**Conditional:** opens a conditional block. Close it with `Game.EndIf()`, not `}`.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2? any
---@param arg3? any
---@param arg4? any
---@param arg5? any
---@param arg6? any
---@param arg7? any
---@param arg8? any
---@param arg9? any
---@param arg10? any
---@param arg11? any
---@param arg12? any
---@param arg13? any
---@param arg14? any
---@param arg15? any
function Game.IfCurrentSkin(arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11, arg12, arg13, arg14, arg15) end

---Emits the `IfRewardUnlocked` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 2 arguments.
---**Conditional:** opens a conditional block. Close it with `Game.EndIf()`, not `}`.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
function Game.IfRewardUnlocked(arg1, arg2) end

---Emits the `IfStartedInCar` script command.
---
---**Scope:** must appear inside a `Mission` scope.
---**Arguments:** takes no arguments.
---**Conditional:** opens a conditional block. Close it with `Game.EndIf()`, not `}`.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
function Game.IfStartedInCar() end

---Emits the `InitLevelPlayerVehicle` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes 3–4 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
---@param arg3 any
---@param arg4? any
function Game.InitLevelPlayerVehicle(arg1, arg2, arg3, arg4) end

---Emits the `KillAllChaseAI` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.KillAllChaseAI(arg1) end

---Emits the `LinkActionToObject` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 5 arguments.
---**Provided by:** the base game.
---**Warning:** Donut Team's documentation marks this command "unused" — Radical's own scripts never used it in a working form. It may do nothing.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
---@param arg3 any
---@param arg4 any
---@param arg5 any
function Game.LinkActionToObject(arg1, arg2, arg3, arg4, arg5) end

---Emits the `LinkActionToObjectJoint` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 5 arguments.
---**Provided by:** the base game.
---**Warning:** Donut Team's documentation marks this command "unused" — Radical's own scripts never used it in a working form. It may do nothing.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
---@param arg3 any
---@param arg4 any
---@param arg5 any
function Game.LinkActionToObjectJoint(arg1, arg2, arg3, arg4, arg5) end

---Emits the `LoadDisposableCar` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 3 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
---@param arg3 any
function Game.LoadDisposableCar(arg1, arg2, arg3) end

---Emits the `LoadP3DFile` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes 1–3 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2? any
---@param arg3? any
function Game.LoadP3DFile(arg1, arg2, arg3) end

---Emits the `LucasTest` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes 0–16 arguments.
---**Provided by:** the `DebugTest` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1? any
---@param arg2? any
---@param arg3? any
---@param arg4? any
---@param arg5? any
---@param arg6? any
---@param arg7? any
---@param arg8? any
---@param arg9? any
---@param arg10? any
---@param arg11? any
---@param arg12? any
---@param arg13? any
---@param arg14? any
---@param arg15? any
---@param arg16? any
function Game.LucasTest(arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11, arg12, arg13, arg14, arg15, arg16) end

---Emits the `MoveStageVehicle` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes exactly 3 arguments.
---**Provided by:** the base game.
---**Warning:** Donut Team's documentation marks this command "unused" — Radical's own scripts never used it in a working form. It may do nothing.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
---@param arg3 any
function Game.MoveStageVehicle(arg1, arg2, arg3) end

---Emits the `msPlacePlayerCarAtLocatorName` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---**Warning:** Donut Team's documentation marks this command "unused" — Radical's own scripts never used it in a working form. It may do nothing.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.msPlacePlayerCarAtLocatorName(arg1) end

---Emits the `MustActionTrigger` script command.
---
---**Scope:** must appear inside a `Objective` scope.
---**Arguments:** takes no arguments.
---**Provided by:** the base game.
function Game.MustActionTrigger() end

---Inverse of `Game.IfAllCheatsEnabled`. Runs its conditional block only when the condition does NOT hold.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes 1–15 arguments.
---**Conditional:** opens a conditional block. Close it with `Game.EndIf()`, not `}`.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2? any
---@param arg3? any
---@param arg4? any
---@param arg5? any
---@param arg6? any
---@param arg7? any
---@param arg8? any
---@param arg9? any
---@param arg10? any
---@param arg11? any
---@param arg12? any
---@param arg13? any
---@param arg14? any
---@param arg15? any
function Game.Not_IfAllCheatsEnabled(arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11, arg12, arg13, arg14, arg15) end

---Inverse of `Game.IfAllMissionsCompleted`. Runs its conditional block only when the condition does NOT hold.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes 1–15 arguments.
---**Conditional:** opens a conditional block. Close it with `Game.EndIf()`, not `}`.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2? any
---@param arg3? any
---@param arg4? any
---@param arg5? any
---@param arg6? any
---@param arg7? any
---@param arg8? any
---@param arg9? any
---@param arg10? any
---@param arg11? any
---@param arg12? any
---@param arg13? any
---@param arg14? any
---@param arg15? any
function Game.Not_IfAllMissionsCompleted(arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11, arg12, arg13, arg14, arg15) end

---Inverse of `Game.IfAnyCheatEnabled`. Runs its conditional block only when the condition does NOT hold.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes 1–15 arguments.
---**Conditional:** opens a conditional block. Close it with `Game.EndIf()`, not `}`.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2? any
---@param arg3? any
---@param arg4? any
---@param arg5? any
---@param arg6? any
---@param arg7? any
---@param arg8? any
---@param arg9? any
---@param arg10? any
---@param arg11? any
---@param arg12? any
---@param arg13? any
---@param arg14? any
---@param arg15? any
function Game.Not_IfAnyCheatEnabled(arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11, arg12, arg13, arg14, arg15) end

---Inverse of `Game.IfAnyMissionCompleted`. Runs its conditional block only when the condition does NOT hold.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes 1–15 arguments.
---**Conditional:** opens a conditional block. Close it with `Game.EndIf()`, not `}`.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2? any
---@param arg3? any
---@param arg4? any
---@param arg5? any
---@param arg6? any
---@param arg7? any
---@param arg8? any
---@param arg9? any
---@param arg10? any
---@param arg11? any
---@param arg12? any
---@param arg13? any
---@param arg14? any
---@param arg15? any
function Game.Not_IfAnyMissionCompleted(arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11, arg12, arg13, arg14, arg15) end

---Inverse of `Game.IfCurrentCar`. Runs its conditional block only when the condition does NOT hold.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes 1–15 arguments.
---**Conditional:** opens a conditional block. Close it with `Game.EndIf()`, not `}`.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2? any
---@param arg3? any
---@param arg4? any
---@param arg5? any
---@param arg6? any
---@param arg7? any
---@param arg8? any
---@param arg9? any
---@param arg10? any
---@param arg11? any
---@param arg12? any
---@param arg13? any
---@param arg14? any
---@param arg15? any
function Game.Not_IfCurrentCar(arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11, arg12, arg13, arg14, arg15) end

---Inverse of `Game.IfCurrentCheckpoint`. Runs its conditional block only when the condition does NOT hold.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes no arguments.
---**Conditional:** opens a conditional block. Close it with `Game.EndIf()`, not `}`.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
function Game.Not_IfCurrentCheckpoint() end

---Inverse of `Game.IfCurrentLevel`. Runs its conditional block only when the condition does NOT hold.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes 1–15 arguments.
---**Conditional:** opens a conditional block. Close it with `Game.EndIf()`, not `}`.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2? any
---@param arg3? any
---@param arg4? any
---@param arg5? any
---@param arg6? any
---@param arg7? any
---@param arg8? any
---@param arg9? any
---@param arg10? any
---@param arg11? any
---@param arg12? any
---@param arg13? any
---@param arg14? any
---@param arg15? any
function Game.Not_IfCurrentLevel(arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11, arg12, arg13, arg14, arg15) end

---Inverse of `Game.IfCurrentSkin`. Runs its conditional block only when the condition does NOT hold.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes 1–15 arguments.
---**Conditional:** opens a conditional block. Close it with `Game.EndIf()`, not `}`.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2? any
---@param arg3? any
---@param arg4? any
---@param arg5? any
---@param arg6? any
---@param arg7? any
---@param arg8? any
---@param arg9? any
---@param arg10? any
---@param arg11? any
---@param arg12? any
---@param arg13? any
---@param arg14? any
---@param arg15? any
function Game.Not_IfCurrentSkin(arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11, arg12, arg13, arg14, arg15) end

---Inverse of `Game.IfRewardUnlocked`. Runs its conditional block only when the condition does NOT hold.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 2 arguments.
---**Conditional:** opens a conditional block. Close it with `Game.EndIf()`, not `}`.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
function Game.Not_IfRewardUnlocked(arg1, arg2) end

---Inverse of `Game.IfStartedInCar`. Runs its conditional block only when the condition does NOT hold.
---
---**Scope:** must appear inside a `Mission` scope.
---**Arguments:** takes no arguments.
---**Conditional:** opens a conditional block. Close it with `Game.EndIf()`, not `}`.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
function Game.Not_IfStartedInCar() end

---Emits the `NoTrafficForStage` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes no arguments.
---**Provided by:** the base game.
function Game.NoTrafficForStage() end

---Emits the `PlacePlayerAtLocatorName` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---**Warning:** Donut Team's documentation marks this command "unused" — Radical's own scripts never used it in a working form. It may do nothing.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.PlacePlayerAtLocatorName(arg1) end

---Emits the `PlacePlayerCar` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 2 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
function Game.PlacePlayerCar(arg1, arg2) end

---Emits the `PreallocateActors` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 2 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
function Game.PreallocateActors(arg1, arg2) end

---Emits the `PutMFPlayerInCar` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes no arguments.
---**Provided by:** the base game.
function Game.PutMFPlayerInCar() end

---Emits the `RemoveDriver` script command.
---
---**Scope:** must appear inside a `Objective` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.RemoveDriver(arg1) end

---Emits the `RemoveNPC` script command.
---
---**Scope:** must appear inside a `Objective` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.RemoveNPC(arg1) end

---Emits the `RemoveStageVehicleCharacter` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes exactly 2 arguments.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
function Game.RemoveStageVehicleCharacter(arg1, arg2) end

---Emits the `RESET_TO_HERE` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes no arguments.
---**Provided by:** the base game.
function Game.RESET_TO_HERE() end

---Emits the `ResetCharacter` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 2 arguments.
---**Provided by:** the base game.
---**Warning:** Donut Team's documentation marks this command "unused" — Radical's own scripts never used it in a working form. It may do nothing.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
function Game.ResetCharacter(arg1, arg2) end

---Emits the `ResetHitAndRun` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes no arguments.
---**Provided by:** the base game.
---**Warning:** Donut Team's documentation marks this command "unused" — Radical's own scripts never used it in a working form. It may do nothing.
function Game.ResetHitAndRun() end

---Emits the `ResetStageHitAndRun` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes no arguments.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
function Game.ResetStageHitAndRun() end

---Emits the `ResetStageVehicleAbductable` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.ResetStageVehicleAbductable(arg1) end

---Emits the `SelectMission` script command.
---
---**Scope:** no scope requirement recorded.
---**Opens scope:** `Mission`.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SelectMission(arg1) end

---Emits the `SetActorRotationSpeed` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 2 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
function Game.SetActorRotationSpeed(arg1, arg2) end

---Emits the `SetAllowSeatSlide` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetAllowSeatSlide(arg1) end

---Emits the `SetAnimatedCameraName` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetAnimatedCameraName(arg1) end

---Emits the `SetAnimCamMulticontName` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetAnimCamMulticontName(arg1) end

---Emits the `SetBonusMissionDialoguePos` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes 3–4 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
---@param arg3 any
---@param arg4? any
function Game.SetBonusMissionDialoguePos(arg1, arg2, arg3, arg4) end

---Emits the `SetBonusMissionStart` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes no arguments.
---**Provided by:** the base game.
---**Warning:** Donut Team's documentation marks this command "unused" — Radical's own scripts never used it in a working form. It may do nothing.
function Game.SetBonusMissionStart() end

---Emits the `SetBrakeScale` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetBrakeScale(arg1) end

---Emits the `SetBurnoutRange` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetBurnoutRange(arg1) end

---Emits the `SetCamBestSide` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes 1–2 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2? any
function Game.SetCamBestSide(arg1, arg2) end

---Emits the `SetCarAttributes` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 5 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
---@param arg3 any
---@param arg4 any
---@param arg5 any
function Game.SetCarAttributes(arg1, arg2, arg3, arg4, arg5) end

---Emits the `SetCarChangeHitAndRunChange` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetCarChangeHitAndRunChange(arg1) end

---Emits the `SetCarStartCamera` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---**Warning:** Donut Team's documentation marks this command "unused" — Radical's own scripts never used it in a working form. It may do nothing.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetCarStartCamera(arg1) end

---Emits the `SetCharacterPosition` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 3 arguments.
---**Provided by:** the base game.
---**Warning:** Donut Team's documentation marks this command "unused" — Radical's own scripts never used it in a working form. It may do nothing.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
---@param arg3 any
function Game.SetCharacterPosition(arg1, arg2, arg3) end

---Emits the `SetCharacterScale` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetCharacterScale(arg1) end

---Emits the `SetCharactersVisible` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetCharactersVisible(arg1) end

---Emits the `SetCharacterToHide` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetCharacterToHide(arg1) end

---Emits the `SetChaseSpawnRate` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes exactly 2 arguments.
---**Provided by:** the base game.
---**Warning:** Donut Team's documentation marks this command "commented" — Radical's own scripts never used it in a working form. It may do nothing.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
function Game.SetChaseSpawnRate(arg1, arg2) end

---Emits the `SetCheckpointDynaLoadData` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes 1–2 arguments.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2? any
function Game.SetCheckpointDynaLoadData(arg1, arg2) end

---Emits the `SetCheckpointPedGroup` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetCheckpointPedGroup(arg1) end

---Emits the `SetCheckpointResetPlayerInCar` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetCheckpointResetPlayerInCar(arg1) end

---Emits the `SetCheckpointResetPlayerOutCar` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes exactly 2 arguments.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
function Game.SetCheckpointResetPlayerOutCar(arg1, arg2) end

---Emits the `SetCheckpointTrafficGroup` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetCheckpointTrafficGroup(arg1) end

---Emits the `SetCMOffsetX` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetCMOffsetX(arg1) end

---Emits the `SetCMOffsetY` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetCMOffsetY(arg1) end

---Emits the `SetCMOffsetZ` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetCMOffsetZ(arg1) end

---Emits the `SetCoinDrawable` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetCoinDrawable(arg1) end

---Emits the `SetCoinFee` script command.
---
---**Scope:** must appear inside a `Objective` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetCoinFee(arg1) end

---Emits the `SetCollectibleEffect` script command.
---
---**Scope:** must appear inside a `Objective` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetCollectibleEffect(arg1) end

---Emits the `SetCollectibleSoundEffect` script command.
---
---**Scope:** must appear inside a `Objective` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetCollectibleSoundEffect(arg1) end

---Emits the `SetCollisionAttributes` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 4 arguments.
---**Provided by:** the base game.
---**Warning:** Donut Team's documentation marks this command "unused" — Radical's own scripts never used it in a working form. It may do nothing.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
---@param arg3 any
---@param arg4 any
function Game.SetCollisionAttributes(arg1, arg2, arg3, arg4) end

---Emits the `SetCompletionDialog` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes 1–2 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2? any
function Game.SetCompletionDialog(arg1, arg2) end

---Emits the `SetCondDecay` script command.
---
---**Scope:** must appear inside a `Condition` scope.
---**Arguments:** takes 1–2 arguments.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2? any
function Game.SetCondDecay(arg1, arg2) end

---Emits the `SetCondDelay` script command.
---
---**Scope:** must appear inside a `Condition` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetCondDelay(arg1) end

---Emits the `SetCondDisplay` script command.
---
---**Scope:** must appear inside a `Condition` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetCondDisplay(arg1) end

---Emits the `SetConditionalParameter` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes 3–5 arguments.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
---@param arg3 any
---@param arg4? any
---@param arg5? any
function Game.SetConditionalParameter(arg1, arg2, arg3, arg4, arg5) end

---Emits the `SetConditionPosition` script command.
---
---**Scope:** must appear inside a `Condition` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetConditionPosition(arg1) end

---Emits the `SetCondMessageIndex` script command.
---
---**Scope:** must appear inside a `Condition` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetCondMessageIndex(arg1) end

---Emits the `SetCondMinHealth` script command.
---
---**Scope:** must appear inside a `Condition` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetCondMinHealth(arg1) end

---Emits the `SetCondSound` script command.
---
---**Scope:** must appear inside a `Condition` scope.
---**Arguments:** takes 1–4 arguments.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2? any
---@param arg3? any
---@param arg4? any
function Game.SetCondSound(arg1, arg2, arg3, arg4) end

---Emits the `SetCondSpeedRangeKMH` script command.
---
---**Scope:** must appear inside a `Condition` scope.
---**Arguments:** takes exactly 2 arguments.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
function Game.SetCondSpeedRangeKMH(arg1, arg2) end

---Emits the `SetCondTargetVehicle` script command.
---
---**Scope:** must appear inside a `Condition` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetCondTargetVehicle(arg1) end

---Emits the `SetCondThreshold` script command.
---
---**Scope:** must appear inside a `Condition` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetCondThreshold(arg1) end

---Emits the `SetCondTime` script command.
---
---**Scope:** must appear inside a `Condition` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetCondTime(arg1) end

---Emits the `SetCondTotal` script command.
---
---**Scope:** must appear inside a `Condition` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetCondTotal(arg1) end

---Emits the `SetCondTrigger` script command.
---
---**Scope:** must appear inside a `Condition` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetCondTrigger(arg1) end

---Emits the `SetConversationCam` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes 2–3 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
---@param arg3? any
function Game.SetConversationCam(arg1, arg2, arg3) end

---Emits the `SetConversationCamDistance` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes exactly 2 arguments.
---**Provided by:** the base game.
---**Warning:** Donut Team's documentation marks this command "unused" — Radical's own scripts never used it in a working form. It may do nothing.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
function Game.SetConversationCamDistance(arg1, arg2) end

---Emits the `SetConversationCamName` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetConversationCamName(arg1) end

---Emits the `SetConversationCamNpcName` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---**Warning:** Donut Team's documentation marks this command "commented" — Radical's own scripts never used it in a working form. It may do nothing.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetConversationCamNpcName(arg1) end

---Emits the `SetConversationCamPcName` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---**Warning:** Donut Team's documentation marks this command "commented" — Radical's own scripts never used it in a working form. It may do nothing.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetConversationCamPcName(arg1) end

---Emits the `SetDamperC` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetDamperC(arg1) end

---Emits the `SetDemoLoopTime` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetDemoLoopTime(arg1) end

---Emits the `SetDestination` script command.
---
---**Scope:** must appear inside a `Objective` scope.
---**Arguments:** takes 1–3 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2? any
---@param arg3? any
function Game.SetDestination(arg1, arg2, arg3) end

---Emits the `SetDialogueInfo` script command.
---
---**Scope:** must appear inside a `Objective` scope.
---**Arguments:** takes exactly 4 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
---@param arg3 any
---@param arg4 any
function Game.SetDialogueInfo(arg1, arg2, arg3, arg4) end

---Emits the `SetDialoguePositions` script command.
---
---**Scope:** must appear inside a `Objective` scope.
---**Arguments:** takes 2–4 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
---@param arg3? any
---@param arg4? any
function Game.SetDialoguePositions(arg1, arg2, arg3, arg4) end

---Emits the `SetDonutTorque` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetDonutTorque(arg1) end

---Emits the `SetDriver` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetDriver(arg1) end

---Emits the `SetDurationTime` script command.
---
---**Scope:** must appear inside a `Objective` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetDurationTime(arg1) end

---Emits the `SetDynaLoadData` script command.
---
---**Scope:** must appear inside a `Mission` scope.
---**Arguments:** takes 1–2 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2? any
function Game.SetDynaLoadData(arg1, arg2) end

---Emits the `SetEBrakeEffect` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetEBrakeEffect(arg1) end

---Emits the `SetFadeOut` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetFadeOut(arg1) end

---Emits the `SetFMVInfo` script command.
---
---**Scope:** must appear inside a `Objective` scope.
---**Arguments:** takes 1–2 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2? any
function Game.SetFMVInfo(arg1, arg2) end

---Emits the `SetFollowDistances` script command.
---
---**Scope:** must appear inside a `Condition` scope.
---**Arguments:** takes exactly 2 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
function Game.SetFollowDistances(arg1, arg2) end

---Emits the `SetForcedCar` script command.
---
---**Scope:** must appear inside a `Mission` scope.
---**Arguments:** takes no arguments.
---**Provided by:** the base game.
function Game.SetForcedCar() end

---Emits the `SetGamblingOdds` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetGamblingOdds(arg1) end

---Emits the `SetGameOver` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes no arguments.
---**Provided by:** the base game.
function Game.SetGameOver() end

---Emits the `SetGasScale` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetGasScale(arg1) end

---Emits the `SetGasScaleSpeedThreshold` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetGasScaleSpeedThreshold(arg1) end

---Emits the `SetHasDoors` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetHasDoors(arg1) end

---Emits the `SetHighRoof` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetHighRoof(arg1) end

---Emits the `SetHighSpeedGasScale` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetHighSpeedGasScale(arg1) end

---Emits the `SetHighSpeedSteeringDrop` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetHighSpeedSteeringDrop(arg1) end

---Emits the `SetHitAndRunDecay` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetHitAndRunDecay(arg1) end

---Emits the `SetHitAndRunDecayHitAndRun` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetHitAndRunDecayHitAndRun(arg1) end

---Emits the `SetHitAndRunDecayInterior` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---**Warning:** Donut Team's documentation marks this command "unused" — Radical's own scripts never used it in a working form. It may do nothing.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetHitAndRunDecayInterior(arg1) end

---Emits the `SetHitAndRunFine` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetHitAndRunFine(arg1) end

---Emits the `SetHitAndRunMeter` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---**Warning:** Donut Team's documentation marks this command "commented" — Radical's own scripts never used it in a working form. It may do nothing.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetHitAndRunMeter(arg1) end

---Emits the `SetHitNRun` script command.
---
---**Scope:** must appear inside a `Condition` scope.
---**Arguments:** takes no arguments.
---**Provided by:** the base game.
function Game.SetHitNRun() end

---Emits the `SetHitPoints` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetHitPoints(arg1) end

---Emits the `SetHUDIcon` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetHUDIcon(arg1) end

---Emits the `SetHUDMapDrawable` script command.
---
---**Scope:** must appear inside a `Mission` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetHUDMapDrawable(arg1) end

---Emits the `SetInitialWalk` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetInitialWalk(arg1) end

---Emits the `SetIrisTransition` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetIrisTransition(arg1) end

---Emits the `SetIrisWipe` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetIrisWipe(arg1) end

---Emits the `SetLevelOver` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes no arguments.
---**Provided by:** the base game.
function Game.SetLevelOver() end

---Emits the `SetMass` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetMass(arg1) end

---Emits the `SetMaxSpeedBurstTime` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetMaxSpeedBurstTime(arg1) end

---Emits the `SetMaxTraffic` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetMaxTraffic(arg1) end

---Emits the `SetMaxWheelTurnAngle` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetMaxWheelTurnAngle(arg1) end

---Emits the `SetMissionNameIndex` script command.
---
---**Scope:** must appear inside a `Mission` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---**Warning:** Donut Team's documentation marks this command "unused" — Radical's own scripts never used it in a working form. It may do nothing.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetMissionNameIndex(arg1) end

---Emits the `SetMissionResetPlayerInCar` script command.
---
---**Scope:** must appear inside a `Mission` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetMissionResetPlayerInCar(arg1) end

---Emits the `SetMissionResetPlayerOutCar` script command.
---
---**Scope:** must appear inside a `Mission` scope.
---**Arguments:** takes exactly 2 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
function Game.SetMissionResetPlayerOutCar(arg1, arg2) end

---Emits the `SetMissionStartCameraName` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetMissionStartCameraName(arg1) end

---Emits the `SetMissionStartMulticontName` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetMissionStartMulticontName(arg1) end

---Emits the `SetMusicState` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes exactly 2 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
function Game.SetMusicState(arg1, arg2) end

---Emits the `SetNoHitAndRunMusicForStage` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes no arguments.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
function Game.SetNoHitAndRunMusicForStage() end

---Emits the `SetNormalSteering` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetNormalSteering(arg1) end

---Emits the `SetNumChaseCars` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetNumChaseCars(arg1) end

---Emits the `SetNumValidFailureHints` script command.
---
---**Scope:** must appear inside a `Mission` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetNumValidFailureHints(arg1) end

---Emits the `SetObjCameraName` script command.
---
---**Scope:** must appear inside a `Objective` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetObjCameraName(arg1) end

---Emits the `SetObjCanSkip` script command.
---
---**Scope:** must appear inside a `Objective` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetObjCanSkip(arg1) end

---Emits the `SetObjDecay` script command.
---
---**Scope:** must appear inside a `Objective` scope.
---**Arguments:** takes 1–2 arguments.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2? any
function Game.SetObjDecay(arg1, arg2) end

---Emits the `SetObjDistance` script command.
---
---**Scope:** must appear inside a `Objective` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetObjDistance(arg1) end

---Emits the `SetObjExplosion` script command.
---
---**Scope:** must appear inside a `Objective` scope.
---**Arguments:** takes 2–3 arguments.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
---@param arg3? any
function Game.SetObjExplosion(arg1, arg2, arg3) end

---Emits the `SetObjFailDistance` script command.
---
---**Scope:** must appear inside a `Objective` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetObjFailDistance(arg1) end

---Emits the `SetObjMessageIndex` script command.
---
---**Scope:** must appear inside a `Objective` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetObjMessageIndex(arg1) end

---Emits the `SetObjMulticontName` script command.
---
---**Scope:** must appear inside a `Objective` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetObjMulticontName(arg1) end

---Emits the `SetObjNoLetterbox` script command.
---
---**Scope:** must appear inside a `Objective` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetObjNoLetterbox(arg1) end

---Emits the `SetObjSound` script command.
---
---**Scope:** must appear inside a `Objective` scope.
---**Arguments:** takes 1–4 arguments.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2? any
---@param arg3? any
---@param arg4? any
function Game.SetObjSound(arg1, arg2, arg3, arg4) end

---Emits the `SetObjSpeedKMH` script command.
---
---**Scope:** must appear inside a `Objective` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetObjSpeedKMH(arg1) end

---Emits the `SetObjTargetBoss` script command.
---
---**Scope:** must appear inside a `Objective` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetObjTargetBoss(arg1) end

---Emits the `SetObjTargetVehicle` script command.
---
---**Scope:** must appear inside a `Objective` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetObjTargetVehicle(arg1) end

---Emits the `SetObjThreshold` script command.
---
---**Scope:** must appear inside a `Objective` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetObjThreshold(arg1) end

---Emits the `SetObjTotal` script command.
---
---**Scope:** must appear inside a `Objective` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetObjTotal(arg1) end

---Emits the `SetObjTrigger` script command.
---
---**Scope:** must appear inside a `Objective` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetObjTrigger(arg1) end

---Emits the `SetObjUseCameraPosition` script command.
---
---**Scope:** must appear inside a `Objective` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetObjUseCameraPosition(arg1) end

---Emits the `SetParkedCarsEnabled` script command.
---
---**Scope:** must appear inside a `Mission` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetParkedCarsEnabled(arg1) end

---Emits the `SetParticleTexture` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 2 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
function Game.SetParticleTexture(arg1, arg2) end

---Emits the `SetParTime` script command.
---
---**Scope:** must appear inside a `Objective` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetParTime(arg1) end

---Emits the `SetPedsEnabled` script command.
---
---**Scope:** must appear inside a `Mission` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetPedsEnabled(arg1) end

---Emits the `SetPickupTarget` script command.
---
---**Scope:** must appear inside a `Objective` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetPickupTarget(arg1) end

---Emits the `SetPlayerCarName` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 2 arguments.
---**Provided by:** the base game.
---**Warning:** Donut Team's documentation marks this command "unused" — Radical's own scripts never used it in a working form. It may do nothing.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
function Game.SetPlayerCarName(arg1, arg2) end

---Emits the `SetPostLevelFMV` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetPostLevelFMV(arg1) end

---Emits the `SetPresentationBitmap` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetPresentationBitmap(arg1) end

---Emits the `SetProjectileStats` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 3 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
---@param arg3 any
function Game.SetProjectileStats(arg1, arg2, arg3) end

---Emits the `SetRaceEnteryFee` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetRaceEnteryFee(arg1) end

---Emits the `SetRaceLaps` script command.
---
---**Scope:** must appear inside a `Objective` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetRaceLaps(arg1) end

---Emits the `SetRespawnRate` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 2 arguments.
---**Provided by:** the base game.
---**Warning:** Donut Team's documentation marks this command "unused" — Radical's own scripts never used it in a working form. It may do nothing.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
function Game.SetRespawnRate(arg1, arg2) end

---Emits the `SetShadowAdjustments` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 8 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
---@param arg3 any
---@param arg4 any
---@param arg5 any
---@param arg6 any
---@param arg7 any
---@param arg8 any
function Game.SetShadowAdjustments(arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8) end

---Emits the `SetShininess` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetShininess(arg1) end

---Emits the `SetSlipEffectNoEBrake` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetSlipEffectNoEBrake(arg1) end

---Emits the `SetSlipGasScale` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetSlipGasScale(arg1) end

---Emits the `SetSlipSteering` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetSlipSteering(arg1) end

---Emits the `SetSlipSteeringNoEBrake` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetSlipSteeringNoEBrake(arg1) end

---Emits the `SetSpringK` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetSpringK(arg1) end

---Emits the `SetStageAIEvadeCatchupParams` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes exactly 3 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
---@param arg3 any
function Game.SetStageAIEvadeCatchupParams(arg1, arg2, arg3) end

---Emits the `SetStageAIRaceCatchupParams` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes exactly 5 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
---@param arg3 any
---@param arg4 any
---@param arg5 any
function Game.SetStageAIRaceCatchupParams(arg1, arg2, arg3, arg4, arg5) end

---Emits the `SetStageAirGravity` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetStageAirGravity(arg1) end

---Emits the `SetStageAITargetCatchupParams` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes exactly 3 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
---@param arg3 any
function Game.SetStageAITargetCatchupParams(arg1, arg2, arg3) end

---Emits the `SetStageAllowMissionCancel` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetStageAllowMissionCancel(arg1) end

---Emits the `SetStageCamera` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes exactly 3 arguments.
---**Provided by:** the base game.
---**Warning:** Donut Team's documentation marks this command "unused" — Radical's own scripts never used it in a working form. It may do nothing.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
---@param arg3 any
function Game.SetStageCamera(arg1, arg2, arg3) end

---Emits the `SetStageCarChangeHitAndRunChange` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetStageCarChangeHitAndRunChange(arg1) end

---Emits the `SetStageCharacterModel` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes 1–2 arguments.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2? any
function Game.SetStageCharacterModel(arg1, arg2) end

---Emits the `SetStageDynaLoadData` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes 1–2 arguments.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2? any
function Game.SetStageDynaLoadData(arg1, arg2) end

---Emits the `SetStageEnabledCheats` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes 1–15 arguments.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2? any
---@param arg3? any
---@param arg4? any
---@param arg5? any
---@param arg6? any
---@param arg7? any
---@param arg8? any
---@param arg9? any
---@param arg10? any
---@param arg11? any
---@param arg12? any
---@param arg13? any
---@param arg14? any
---@param arg15? any
function Game.SetStageEnabledCheats(arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11, arg12, arg13, arg14, arg15) end

---Emits the `SetStageHitAndRun` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetStageHitAndRun(arg1) end

---Emits the `SetStageHitAndRunDecay` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetStageHitAndRunDecay(arg1) end

---Emits the `SetStageHitAndRunDecayHitAndRun` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetStageHitAndRunDecayHitAndRun(arg1) end

---Emits the `SetStageHitAndRunDecayInterior` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetStageHitAndRunDecayInterior(arg1) end

---Emits the `SetStageHitAndRunFine` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetStageHitAndRunFine(arg1) end

---Emits the `SetStageKickForce` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetStageKickForce(arg1) end

---Emits the `SetStageMessageIndex` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes 1–2 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2? any
function Game.SetStageMessageIndex(arg1, arg2) end

---Emits the `SetStageMusicAlwaysOn` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes no arguments.
---**Provided by:** the base game.
function Game.SetStageMusicAlwaysOn() end

---Emits the `SetStageMusicEvent` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetStageMusicEvent(arg1) end

---Emits the `SetStageNumChaseCars` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetStageNumChaseCars(arg1) end

---Emits the `SetStagePayout` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetStagePayout(arg1) end

---Emits the `SetStagePedGroup` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetStagePedGroup(arg1) end

---Emits the `SetStageSlamForce` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetStageSlamForce(arg1) end

---Emits the `SetStageTime` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetStageTime(arg1) end

---Emits the `SetStageTrafficGroup` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetStageTrafficGroup(arg1) end

---Emits the `SetStageVehicleAbductable` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes exactly 2 arguments.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
function Game.SetStageVehicleAbductable(arg1, arg2) end

---Emits the `SetStageVehicleAllowSeatSlide` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes exactly 2 arguments.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
function Game.SetStageVehicleAllowSeatSlide(arg1, arg2) end

---Emits the `SetStageVehicleCharacterAnimation` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes 3–4 arguments.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
---@param arg3 any
---@param arg4? any
function Game.SetStageVehicleCharacterAnimation(arg1, arg2, arg3, arg4) end

---Emits the `SetStageVehicleCharacterJumpOut` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes 2–3 arguments.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
---@param arg3? any
function Game.SetStageVehicleCharacterJumpOut(arg1, arg2, arg3) end

---Emits the `SetStageVehicleCharacterScale` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes exactly 3 arguments.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
---@param arg3 any
function Game.SetStageVehicleCharacterScale(arg1, arg2, arg3) end

---Emits the `SetStageVehicleCharacterVisible` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes exactly 2 arguments.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
function Game.SetStageVehicleCharacterVisible(arg1, arg2) end

---Emits the `SetStageVehicleNoDestroyedJumpOut` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetStageVehicleNoDestroyedJumpOut(arg1) end

---Emits the `SetStageVehicleReset` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes exactly 2 arguments.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
function Game.SetStageVehicleReset(arg1, arg2) end

---Emits the `SetStatepropShadow` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 2 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
function Game.SetStatepropShadow(arg1, arg2) end

---Emits the `SetSuspensionLimit` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetSuspensionLimit(arg1) end

---Emits the `SetSuspensionYOffset` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetSuspensionYOffset(arg1) end

---Emits the `SetSwapDefaultCarLocator` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetSwapDefaultCarLocator(arg1) end

---Emits the `SetSwapForcedCarLocator` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetSwapForcedCarLocator(arg1) end

---Emits the `SetSwapPlayerLocator` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetSwapPlayerLocator(arg1) end

---Emits the `SetTalkToTarget` script command.
---
---**Scope:** must appear inside a `Objective` scope.
---**Arguments:** takes 1–4 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2? any
---@param arg3? any
---@param arg4? any
function Game.SetTalkToTarget(arg1, arg2, arg3, arg4) end

---Emits the `SetTireGrip` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetTireGrip(arg1) end

---Emits the `SetTopSpeedKmh` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetTopSpeedKmh(arg1) end

---Emits the `SetTotalGags` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 2 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
function Game.SetTotalGags(arg1, arg2) end

---Emits the `SetTotalWasps` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 2 arguments.
---**Provided by:** the base game.
---**Warning:** Donut Team's documentation marks this command "unused" — Radical's own scripts never used it in a working form. It may do nothing.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
function Game.SetTotalWasps(arg1, arg2) end

---Emits the `SetVehicleAIParams` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes exactly 3 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
---@param arg3 any
function Game.SetVehicleAIParams(arg1, arg2, arg3) end

---Emits the `SetVehicleCharacterAnimation` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes 2–3 arguments.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
---@param arg3? any
function Game.SetVehicleCharacterAnimation(arg1, arg2, arg3) end

---Emits the `SetVehicleCharacterJumpOut` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes 1–2 arguments.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2? any
function Game.SetVehicleCharacterJumpOut(arg1, arg2) end

---Emits the `SetVehicleCharacterScale` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 2 arguments.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
function Game.SetVehicleCharacterScale(arg1, arg2) end

---Emits the `SetVehicleCharacterVisible` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetVehicleCharacterVisible(arg1) end

---Emits the `SetVehicleToLoad` script command.
---
---**Scope:** must appear inside a `Objective` scope.
---**Arguments:** takes exactly 3 arguments.
---**Provided by:** the base game.
---**Warning:** Donut Team's documentation marks this command "unused" — Radical's own scripts never used it in a working form. It may do nothing.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
---@param arg3 any
function Game.SetVehicleToLoad(arg1, arg2, arg3) end

---Emits the `SetWeebleOffset` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetWeebleOffset(arg1) end

---Emits the `SetWheelieOffsetX` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetWheelieOffsetX(arg1) end

---Emits the `SetWheelieOffsetY` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetWheelieOffsetY(arg1) end

---Emits the `SetWheelieOffsetZ` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetWheelieOffsetZ(arg1) end

---Emits the `SetWheelieRange` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SetWheelieRange(arg1) end

---Emits the `ShowHUD` script command.
---
---**Scope:** must appear inside a `Mission` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.ShowHUD(arg1) end

---Emits the `ShowStageComplete` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes no arguments.
---**Provided by:** the base game.
function Game.ShowStageComplete() end

---Emits the `Sleep` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the `DebugTest` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.Sleep(arg1) end

---Emits the `StageStartMusicEvent` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.StageStartMusicEvent(arg1) end

---Emits the `StartCountdown` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes 1–2 arguments.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2? any
function Game.StartCountdown(arg1, arg2) end

---Emits the `StayInBlack` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes no arguments.
---**Provided by:** the base game.
function Game.StayInBlack() end

---Emits the `StreetRacePropsLoad` script command.
---
---**Scope:** must appear inside a `Mission` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.StreetRacePropsLoad(arg1) end

---Emits the `StreetRacePropsUnload` script command.
---
---**Scope:** must appear inside a `Mission` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.StreetRacePropsUnload(arg1) end

---Emits the `SuppressDriver` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.SuppressDriver(arg1) end

---Emits the `SwapInDefaultCar` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes no arguments.
---**Provided by:** the base game.
function Game.SwapInDefaultCar() end

---Emits the `TaskMessage` script command.
---
---**Scope:** no scope requirement recorded.
---**Arguments:** takes 3–4 arguments.
---**Provided by:** the `DebugTest` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
---@param arg2 any
---@param arg3 any
---@param arg4? any
function Game.TaskMessage(arg1, arg2, arg3, arg4) end

---Emits the `TurnGotoDialogOff` script command.
---
---**Scope:** must appear inside a `Objective` scope.
---**Arguments:** takes no arguments.
---**Provided by:** the base game.
function Game.TurnGotoDialogOff() end

---Emits the `UseElapsedTime` script command.
---
---**Scope:** must appear inside a `Stage` scope.
---**Arguments:** takes no arguments.
---**Provided by:** the base game.
function Game.UseElapsedTime() end

---Emits the `UsePedGroup` script command.
---
---**Scope:** must appear inside a `Mission` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the base game.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.UsePedGroup(arg1) end

---Emits the `UseTrafficGroup` script command.
---
---**Scope:** must appear inside a `Mission` scope.
---**Arguments:** takes exactly 1 argument.
---**Provided by:** the `AdditionalScriptFunctionality` hack.
---
---Argument names and types are NOT documented upstream, so every parameter is `any`.
---@param arg1 any
function Game.UseTrafficGroup(arg1) end

---Closes a conditional block opened by a conditional command.
---
---Game.lua emits the opening `{` itself, so a conditional block is closed
---with this call rather than with `}`.
---
---**Arguments:** takes no arguments.
---
---Defined by Game.lua outside the command tables. When no conditional
---commands are loaded it exists but raises a Lua error when called.
function Game.EndIf() end

---Legacy inverse-conditional helper.
---
---**Deprecated.** Older versions of Game.lua used `Game.Not()`; current
---versions register `Not_`-prefixed commands instead, which this file
---generates. Retained upstream for backwards compatibility.
---
---**Arguments:** takes no arguments.
---@deprecated
function Game.Not() end
