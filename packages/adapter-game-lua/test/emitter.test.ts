import { describe, expect, it } from 'vitest';
import { GameLuaEmitter, ScopeError, formatArgument } from '../src/emitter.js';

describe('formatArgument', () => {
  it('always quotes strings, as Game.lua requires', () => {
    // Radical's MFK omitted quotes in places; Lua does not allow that.
    expect(formatArgument('JasperTrig')).toBe('"JasperTrig"');
  });

  it('doubles backslashes inside string literals', () => {
    expect(formatArgument('art\\missions\\level01\\m0.p3d')).toBe(
      '"art\\\\missions\\\\level01\\\\m0.p3d"',
    );
  });

  it('emits numbers and booleans unquoted', () => {
    expect(formatArgument(131)).toBe('131');
    expect(formatArgument(true)).toBe('true');
  });

  it('refuses non-finite numbers rather than emitting broken Lua', () => {
    expect(() => formatArgument(Number.NaN)).toThrow(TypeError);
    expect(() => formatArgument(Number.POSITIVE_INFINITY)).toThrow(TypeError);
  });
});

describe('GameLuaEmitter scope tracking', () => {
  it("produces the nesting shown in Game.lua's own documentation", () => {
    const emitter = new GameLuaEmitter();
    emitter.open('Mission', 'SelectMission', ['m0']);
    emitter.call('SetMissionResetPlayerInCar', ['level1_carstart']);
    emitter.open('Stage', 'AddStage');
    emitter.call('SetHUDIcon', ['kwike']);
    emitter.open('Objective', 'AddObjective', ['dummy']);
    emitter.close('Objective', 'CloseObjective');
    emitter.close('Stage', 'CloseStage');
    emitter.close('Mission', 'CloseMission');
    emitter.assertBalanced();

    expect(emitter.toString()).toBe(
      [
        'Game.SelectMission("m0")',
        '\tGame.SetMissionResetPlayerInCar("level1_carstart")',
        '\tGame.AddStage()',
        '\t\tGame.SetHUDIcon("kwike")',
        '\t\tGame.AddObjective("dummy")',
        '\t\tGame.CloseObjective()',
        '\tGame.CloseStage()',
        'Game.CloseMission()',
        '',
      ].join('\n'),
    );
  });

  it('refuses to close a scope that is not the innermost one', () => {
    const emitter = new GameLuaEmitter();
    emitter.open('Mission', 'SelectMission', ['m0']);
    emitter.open('Stage', 'AddStage');
    expect(() => emitter.close('Mission', 'CloseMission')).toThrow(ScopeError);
  });

  it('detects an unclosed scope', () => {
    const emitter = new GameLuaEmitter();
    emitter.open('Mission', 'SelectMission', ['m0']);
    expect(() => emitter.assertBalanced()).toThrow(/Unclosed scope/);
  });
});

describe('conditional blocks', () => {
  it('closes conditionals with Game.EndIf(), not a brace', () => {
    const emitter = new GameLuaEmitter();
    emitter.beginIf('IfCurrentCheckpoint');
    emitter.call('SetStageTime', [20]);
    emitter.endIf();
    emitter.assertBalanced();

    expect(emitter.toString()).toBe(
      ['Game.IfCurrentCheckpoint()', '\tGame.SetStageTime(20)', 'Game.EndIf()', ''].join('\n'),
    );
  });

  it('uses the Not_ prefix for inverse conditionals', () => {
    const emitter = new GameLuaEmitter();
    emitter.beginIf('IfCurrentCheckpoint', [], true);
    emitter.endIf();
    expect(emitter.toString()).toContain('Game.Not_IfCurrentCheckpoint()');
  });

  it('refuses EndIf with no open conditional', () => {
    expect(() => new GameLuaEmitter().endIf()).toThrow(ScopeError);
  });

  it('detects an unclosed conditional', () => {
    const emitter = new GameLuaEmitter();
    emitter.beginIf('IfCurrentCheckpoint');
    expect(() => emitter.assertBalanced()).toThrow(/conditional block/);
  });
});
